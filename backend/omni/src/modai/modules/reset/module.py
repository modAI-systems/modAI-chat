from abc import ABC, abstractmethod
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from modai.module import ModaiModule, ModuleDependencies


class ResetModule(ModaiModule, ABC):
    """
    Module Declaration for: Reset (Web Module)

    Exposes POST /api/reset/full which wipes all data managed by registered
    Resettable modules, leaving the system in a clean, empty-but-functional state.

    This is intended for test environments only. The endpoint must not be
    registered in production deployments.

    Contract:
    - POST /api/reset/full
        - Returns 200 {"status": "ok"} when all resets succeed.
        - Returns 500 {"error": ..., "failed_modules": [...]} when at least one
          module fails to reset. Remaining modules are still called even after a
          partial failure.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route("/api/reset/full", self.reset_full, methods=["POST"])

    @abstractmethod
    def reset_full(self) -> JSONResponse:
        """
        Trigger a full reset of all registered resettable modules.

        Returns a JSONResponse:
        - 200 {"status": "ok"} on complete success
        - 500 {"error": "One or more resets failed", "failed_modules": [...]}
          when at least one module raised an exception
        """
        pass
