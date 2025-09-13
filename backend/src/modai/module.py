from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class ModaiModule(ABC):
    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        self.dependencies = dependencies
        self.config = config


class PersistenceModule(ModaiModule, ABC):
    """
    Core interface for modules that perform data persistence.
    This interface is defined in the modAI core framework.
    Each persistence module is completely self-contained and manages
    its own database connections, tables, and data.
    """

    @abstractmethod
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Performs data migration for this module

        Args:
            software_version: Current software version
            previous_version: Previous version (None for fresh install)
        """
        pass


class ModuleDependencies:
    def __init__(self, modules: dict[str, ModaiModule] | None = None):
        self.modules = modules or {}
