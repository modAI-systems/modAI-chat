from abc import ABC, abstractmethod
from fastapi import APIRouter
from typing import Any

from modai.module import ModaiModule, ModuleDependencies


class HealthModule(ModaiModule, ABC):
    """
    Module Declaration for: Health (Web Module)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()  # This makes it a web module
        self.router.add_api_route("/api/v1/health", self.get_health, methods=["GET"])

    @abstractmethod
    def get_health(self) -> dict[str, Any]:
        """
        Returns the health status of the application in form of a json
        {
            "status": "<STATUS>"
        }

        The STATUS can be
        * healthy if the application is up and running

        Other statuses are currently not supported.
        """
        pass
