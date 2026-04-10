import logging
import os
import re
from pathlib import Path
from typing import Any

import yaml
from modai.module import ModuleDependencies
from modai.modules.startup_config.module import StartupConfig


logger = logging.getLogger(__name__)

_ENV_VAR_PATTERN = re.compile(r"^\${([A-Za-z_][A-Za-z0-9_]*)}$")

## This is a boostrap Module meaning that it is not changable via the usual
## module loading mechanism and must not follow a few rules like the
## __init__ function signature.


class _OverrideValue:
    """Sentinel produced by the ``!override`` YAML tag.

    The tagged value completely replaces the corresponding base value — no
    deep-merge is performed at this level or below.
    """

    def __init__(self, value: Any):
        self.value = value


class _DropValue:
    """Sentinel produced by the ``!drop`` YAML tag.

    The tagged key (or module) is removed from the base and is not re-added.
    """


class _ModaiYamlLoader(yaml.SafeLoader):
    """SafeLoader extended with ``!override`` and ``!drop`` tag support."""


def _construct_override(loader: yaml.SafeLoader, node: yaml.Node) -> _OverrideValue:
    if isinstance(node, yaml.MappingNode):
        value = loader.construct_mapping(node, deep=True)
    elif isinstance(node, yaml.SequenceNode):
        value = loader.construct_sequence(node, deep=True)
    else:
        value = loader.construct_scalar(node)
    return _OverrideValue(value)


def _construct_drop(loader: yaml.SafeLoader, node: yaml.Node) -> _DropValue:
    return _DropValue()


_ModaiYamlLoader.add_constructor("!override", _construct_override)
_ModaiYamlLoader.add_constructor("!drop", _construct_drop)


class YamlConfigModule(StartupConfig):
    """Default implementation of the StartupConfig module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        if not self.config.get("config_path") or not os.path.exists(
            self.config.get("config_path", "")
        ):
            raise FileNotFoundError(
                f"Config file not found at {self.config.get('config_path')}"
            )

    def get_config(self) -> dict[str, Any]:
        try:
            config_path = Path(self.config.get("config_path"))
            return self._load_config(config_path)
        except Exception as e:
            logger.error(f"Error loading config file: {e}")
            raise

    def _load_config(self, config_path: Path) -> dict[str, Any]:
        """Load the root config and apply its includes.

        ## Load order

        Only the root config file may contain ``includes``. Includes are
        processed left-to-right first, then the root config itself is applied
        last:

        1. The first include's modules are loaded.
        2. Each subsequent include is applied in order, top-to-bottom.
           Later includes overwrite earlier ones on ``merge`` collisions.
        3. The root config's own modules are applied last and always win
           (highest priority).

        Example: root → [A, B]

            A modules     (loaded 1st)
            B modules     (loaded 2nd — overwrites A on collision)
            root modules  (loaded last — highest precedence, always wins)

        Nested includes (includes inside an included file) are intentionally
        **not** supported. This keeps the include mechanism simple and avoids
        hard-to-debug problems that arise from transitive dependency chains and
        non-obvious load orders.
        """
        root_config = self._load_yaml_file(config_path)
        includes = root_config.pop("includes", [])

        # Apply includes top-to-bottom; later includes overwrite earlier ones.
        accumulated_modules: dict[str, Any] = {}
        for include in includes:
            include_path = config_path.parent / include["path"]
            included_config = self._load_yaml_file(include_path)
            if "includes" in included_config:
                raise ValueError(
                    f"Nested includes are not supported. "
                    f"'{include_path}' contains an 'includes' key. "
                    "Only the root config file may use 'includes'."
                )
            accumulated_modules = self._apply_config(
                accumulated_modules, included_config.get("modules") or {}
            )

        # Root is applied last — always wins.
        root_modules = self._apply_config(
            accumulated_modules, root_config.get("modules") or {}
        )
        return {"modules": root_modules}

    def _load_yaml_file(self, path: Path) -> dict[str, Any]:
        with open(path, "r") as file:
            config = yaml.load(file, Loader=_ModaiYamlLoader)
            if config is None:
                raise ValueError(f"Config file is empty or invalid: {path}")
            return _resolve_env_vars(config)

    def _apply_config(
        self, base_modules: dict[str, Any], new_modules: dict[str, Any]
    ) -> dict[str, Any]:
        """Merge *new_modules* onto *base_modules* and return the result.

        * Modules present only in *base_modules* are kept as-is.
        * Modules present only in *new_modules* are added unconditionally.
        * On a name collision the merge behaviour is controlled by YAML tags
          placed on the **incoming** (*new_modules*) entry:

          - ``!drop`` – the incoming entry is not added, and any existing entry
            with the same name in *base_modules* is also removed.
          - ``!override`` – the incoming entry completely replaces the existing
            one; no deep-merge is performed.
          - *(no tag, default)* – deep-merged; base-only keys are preserved,
            shared keys are overwritten by the incoming value, nested dicts
            recurse with the same rule, lists are concatenated (base + incoming).

        The ``!override`` and ``!drop`` tags may also be placed on any nested
        key within a module definition for fine-grained control.

        Because the root config's modules are always passed last (see
        ``_load_config``), they act as the final incoming and always win.
        """
        result = dict(base_modules)

        for name, cfg in new_modules.items():
            if isinstance(cfg, _DropValue):
                result.pop(name, None)
                continue
            if isinstance(cfg, _OverrideValue):
                result[name] = cfg.value
                continue
            if name not in result:
                result[name] = cfg
            else:
                result[name] = _deep_merge(result[name] or {}, cfg or {})

        return result


def _resolve_env_vars(obj: Any) -> Any:
    if isinstance(obj, _OverrideValue):
        return _OverrideValue(_resolve_env_vars(obj.value))
    elif isinstance(obj, _DropValue):
        return obj
    elif isinstance(obj, dict):
        return {k: _resolve_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_resolve_env_vars(i) for i in obj]
    elif isinstance(obj, str):
        match = _ENV_VAR_PATTERN.match(obj)
        if match:
            return os.environ.get(match.group(1), "")
        return obj
    else:
        return obj


def _deep_merge(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    """Return a new dict with *incoming* merged into *base*.

    - Keys present only in *base* are preserved (nothing is removed).
    - Keys present only in *incoming* are added.
    - ``!drop`` on an incoming value removes the key from the result.
    - ``!override`` on an incoming value uses it as-is (no further merging).
    - When both sides share a key: dicts are merged recursively, lists are
      concatenated (base first, then incoming), other values are replaced by
      the incoming value.
    """
    result = dict(base)
    for key, value in incoming.items():
        if isinstance(value, _DropValue):
            result.pop(key, None)
        elif isinstance(value, _OverrideValue):
            result[key] = value.value
        elif key in result:
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = _deep_merge(result[key], value)
            elif isinstance(result[key], list) and isinstance(value, list):
                result[key] = result[key] + value
            else:
                result[key] = value
        else:
            result[key] = value
    return result
