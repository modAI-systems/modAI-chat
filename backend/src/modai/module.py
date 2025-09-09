from __future__ import annotations
from abc import ABC
from typing import Any


class ModaiModule(ABC):
    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        self.dependencies = dependencies
        self.config = config


class ModuleDependencies:
    def __init__(self, modules: dict[str, ModaiModule] | None = None):
        self.modules = modules or {}
