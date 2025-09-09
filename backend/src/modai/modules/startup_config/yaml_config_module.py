import logging
import os
from pathlib import Path
from typing import Any

import yaml
from modai.module import ModuleDependencies
from modai.modules.startup_config.module import StartupConfig


logger = logging.getLogger(__name__)


## This is a boostrap Module meaning that it is not changable via the usual
## module loading mechanism and must not follow a few rules like the
## __init__ function signature.


class YamlConfigModule(StartupConfig):
    """Default implementation of the StartupConfig module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        if "config_path" not in config:
            # Fallback to default_config.yaml relative to the modai package
            modai_package_dir = Path(__file__).parent.parent.parent
            self.config["config_path"] = modai_package_dir / "default_config.yaml"

        if not os.path.exists(self.config.get("config_path")):
            raise FileNotFoundError(
                f"Config file not found at {self.config.get('config_path')}"
            )

    def get_config(self) -> dict[str, Any]:
        import re

        ENV_VAR_PATTERN = re.compile(r"^\${([A-Za-z_][A-Za-z0-9_]*)}$")

        def resolve_env_vars(obj):
            if isinstance(obj, dict):
                return {k: resolve_env_vars(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [resolve_env_vars(i) for i in obj]
            elif isinstance(obj, str):
                match = ENV_VAR_PATTERN.match(obj)
                if match:
                    var_name = match.group(1)
                    return os.environ.get(var_name, obj)
                return obj
            else:
                return obj

        try:
            with open(self.config.get("config_path"), "r") as file:
                config = yaml.safe_load(file)
                if config is None:
                    raise ValueError(
                        f"Config file is empty or invalid: {self.config.get('config_path')}"
                    )
                config = resolve_env_vars(config)
                return config
        except Exception as e:
            logger.error(f"Error loading config file: {e}")
            raise
