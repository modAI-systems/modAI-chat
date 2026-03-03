import importlib
import logging
from typing import Any

from modai.module import ModaiModule, ModuleDependencies


logger = logging.getLogger(__name__)


class ModuleLoader:
    """Handles loading and instantiation of modules."""

    def __init__(self, startup_config: dict[str, Any]):
        self.startup_config = startup_config
        self.loaded_modules: dict[str, ModaiModule] = {}

    def get_web_modules(self) -> list[ModaiModule]:
        """Get all loaded web modules."""
        return [
            module
            for module in self.loaded_modules.values()
            if hasattr(module, "router")
        ]

    def get_module(self, module_name: str) -> ModaiModule | None:
        """Get a loaded module by its name."""
        return self.loaded_modules.get(module_name)

    def load_modules(self) -> None:
        """Load all modules specified in configuration."""
        modules_config = self.startup_config.get("modules", {})
        modules_config = {
            name: config if config else {} for name, config in modules_config.items()
        }
        modules_config = self._filter_disabled_modules(modules_config)

        # Load modules with dependency resolution
        self._load_modules_with_dependencies(modules_config)

    def _filter_disabled_modules(
        self, modules_config: dict[str, dict[str, Any]]
    ) -> dict[str, dict[str, Any]]:
        """Filter out disabled modules from the configuration."""

        enabled_modules = {}

        for key, config in modules_config.items():
            if config.get("enabled", True) is False:
                logger.info(f"Module '{key}' is disabled, skipping")
            else:
                enabled_modules[key] = config

        return enabled_modules

    def _load_modules_with_dependencies(
        self, modules_config: dict[str, dict[str, Any]]
    ) -> None:
        """Load modules while respecting their dependencies."""
        # Create a copy of modules to instantiate
        remaining_modules = modules_config.copy()

        for module_name, full_module_config in list(remaining_modules.items()):
            module_dependencies = self._construct_module_dependencies(
                full_module_config.get("module_dependencies", {})
            )

            if module_dependencies is None:
                continue

            module_class_path = full_module_config.get("class")
            nested_config = full_module_config.get("config", {})
            self._load_module(
                module_name, module_class_path, module_dependencies, nested_config
            )

            del remaining_modules[module_name]

        # If no single module was loaded means we are stuck because of dependency issues
        if len(remaining_modules) > 0 and len(remaining_modules) == len(modules_config):
            logger.error(
                f"Unresolvable module dependencies for modules: {list(remaining_modules.keys())}"
            )
        elif len(remaining_modules) > 0:
            # Load remaining modules again (in case some dependencies were loaded in the first pass)
            self._load_modules_with_dependencies(remaining_modules)

    def _load_module(
        self,
        module_name: str,
        module_class_path: str,
        module_dependencies: ModuleDependencies,
        nested_config: dict[str, Any],
    ) -> None:
        """Load a single module with error handling."""
        try:
            if not module_class_path:
                raise ValueError(f"Module '{module_name}' has no class defined")

            module_class = self._import_class(module_class_path)
            if not module_class:
                return

            module_instance = module_class(module_dependencies, nested_config)
            if not module_instance:
                return

            self.loaded_modules[module_name] = module_instance
            logger.info(f"Successfully loaded module: {module_name}")
        except Exception as e:
            logger.error(f"Failed to load module {module_name}: {e}")
            # Continue with other modules (graceful degradation)

    def _import_class(self, class_path: str):
        """Import a class from a dotted path."""
        module_path, class_name = class_path.rsplit(".", 1)
        module = importlib.import_module(module_path)
        return getattr(module, class_name)

    def _construct_module_dependencies(
        self, module_dependencies: dict[str, str]
    ) -> ModuleDependencies | None:
        """Construct ModuleDependencies object from dependency
        mapping or None, if the dependencies are not met"""
        dependencies = {}
        for dep_key, dep_module_name in module_dependencies.items():
            if dep_module_name not in self.loaded_modules:
                return None
            dependencies[dep_key] = self.loaded_modules.get(dep_module_name)
        return ModuleDependencies(dependencies)
