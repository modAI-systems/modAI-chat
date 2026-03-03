from typing import Any
from modai.module import ModuleDependencies
from modai.modules.health.module import HealthModule


class SimpleHealthModule(HealthModule):
    """Default implementation of the Health module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    def get_health(self) -> dict[str, Any]:
        return {"status": "healthy"}
