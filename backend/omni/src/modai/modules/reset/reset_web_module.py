import logging
from typing import Any

from fastapi.responses import JSONResponse

from modai.module import ModuleDependencies
from modai.modules.reset.module import ResetModule
from modai.modules.reset.resettable import Resettable


logger = logging.getLogger(__name__)


class ResetWebModule(ResetModule):
    """Default implementation of the Reset module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self._resettable_modules: list[Resettable] = [
            module
            for module in dependencies.modules.values()
            if isinstance(module, Resettable)
        ]

    def reset_full(self) -> JSONResponse:
        failures: list[str] = []

        for module in self._resettable_modules:
            name = module.__class__.__name__
            try:
                module.reset()
                logger.info(f"Reset succeeded for module: {name}")
            except Exception as exc:
                logger.error(f"Reset failed for module {name}: {exc}", exc_info=True)
                failures.append(name)

        if failures:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "One or more resets failed",
                    "failed_modules": failures,
                },
            )

        return JSONResponse(status_code=200, content={"status": "ok"})
