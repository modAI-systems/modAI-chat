import logging
from typing import Any

from fastapi import APIRouter, Request

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)


class ToolsRouterModule(ToolRegistryModule):
    """Central tools router that aggregates multiple tool registries.

    Exposes ``GET /api/tools`` and returns the union of all tool definitions
    from configured registries without renaming tool names.

    Runtime invocations are dispatched by finding the registry that provides
    the requested tool name.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        self._registries: dict[str, ToolRegistryModule] = {}
        for dependency_name, module in dependencies.modules.items():
            if isinstance(module, ToolRegistryModule):
                self._registries[dependency_name] = module

        self.router = APIRouter()
        self.router.add_api_route("/api/tools", self.get_tools, methods=["GET"])

    async def get_tools(self, request: Request) -> list[ToolDefinition]:
        aggregated_tools: list[ToolDefinition] = []
        for registry_dependency_key, registry in self._registries.items():
            try:
                tools = await registry.get_tools(request)
            except Exception as exc:
                logger.warning(
                    "Failed to load tools from registry '%s': %s",
                    registry_dependency_key,
                    exc,
                )
                continue

            aggregated_tools.extend(tools)

        return aggregated_tools

    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        name = params.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("Tool invocation requires a non-empty 'name'")

        matching_registries: list[ToolRegistryModule] = []
        for registry in self._registries.values():
            tools = await registry.get_tools(request)
            if any(tool.get("name") == name for tool in tools):
                matching_registries.append(registry)

        if not matching_registries:
            raise ValueError(f"Tool '{name}' not found")
        if len(matching_registries) > 1:
            raise ValueError(
                f"Tool '{name}' is provided by multiple registries; tool names must be unique"
            )

        return await matching_registries[0].run_tool(request, dict(params))
