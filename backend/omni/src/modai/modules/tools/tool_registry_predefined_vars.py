"""Composing tool registry that hides pre-known variables from tool definitions.

A caller of the tool registry may already have values for certain tool
parameters (e.g. ``_session_id``, ``_bearer_token``).  By passing these as
``predefined_params`` to :meth:`get_tools` / :meth:`get_tool_by_name`, the
``PredefinedVariablesToolRegistryModule`` removes the corresponding properties
from each tool's definition so the LLM is never asked to supply them.

At invocation time the predefined values are re-injected into ``run()``
(translating ``_key`` → ``key``) before delegating to the inner tool, so
URL-path substitution and body serialisation work as normal.

This module is a pure decorator/composite: it has no knowledge of URLs,
HTTP, or OpenAPI — all actual tool work is performed by the inner registry
supplied via the ``tool_registry`` module dependency.
"""

import logging
from typing import Any

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)


class _PredefinedVariablesTool(Tool):
    """Wraps an inner Tool, hiding known variables from its public definition.

    When :meth:`run` is called the hidden variables are translated back from
    their ``_``-prefixed predefined form (e.g. ``_session_id`` → ``session_id``)
    before the call is forwarded, so the inner tool can handle them normally
    (URL substitution, request body, etc.).
    """

    def __init__(
        self,
        inner: Tool,
        hidden_properties: set[str],
        filtered_definition: ToolDefinition,
    ) -> None:
        self._inner = inner
        self._hidden_properties = hidden_properties
        self._filtered_definition = filtered_definition

    @property
    def definition(self) -> ToolDefinition:
        return self._filtered_definition

    async def run(self, params: dict[str, Any]) -> Any:
        """Forward to inner tool after translating predefined ``_key`` → ``key``."""
        translated = dict(params)
        for prop in self._hidden_properties:
            prefixed = f"_{prop}"
            if prefixed in translated:
                translated[prop] = translated.pop(prefixed)
        return await self._inner.run(translated)


class PredefinedVariablesToolRegistryModule(ToolRegistryModule):
    """Tool registry decorator that strips pre-supplied variables from definitions.

    Wraps another :class:`~modai.modules.tools.module.ToolRegistryModule` and
    filters its tool definitions based on ``predefined_params`` passed by the
    caller.  Properties whose names appear in ``predefined_params`` (after
    stripping the leading ``_``) are removed from each tool's ``parameters``
    schema so the LLM is not prompted to provide values the caller already has.

    At run time the predefined values are translated (``_key`` → ``key``) and
    injected back, so inner tool implementations receive them as regular
    parameters.

    Configuration:
        (none — all tool configuration belongs to the inner registry)

    Module Dependencies:
        delegate_registry: the concrete :class:`ToolRegistryModule` that does the
            actual spec-fetching and HTTP invocation.

    Example config.yaml::

        modules:
          openapi_registry:
            type: OpenAPIToolRegistryModule
            ...

          tool_registry:
            type: PredefinedVariablesToolRegistryModule
            dependencies:
              delegate_registry: openapi_registry
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self._inner_registry: ToolRegistryModule = dependencies.get_module(
            "delegate_registry"
        )  # type: ignore[assignment]

    async def get_tools(
        self, predefined_params: dict[str, Any] | None = None
    ) -> list[Tool]:
        tools = await self._inner_registry.get_tools(predefined_params)
        hidden = _hidden_property_names(predefined_params)
        return [_wrap_tool(tool, hidden) for tool in tools]

    async def get_tool_by_name(
        self, name: str, predefined_params: dict[str, Any] | None = None
    ) -> Tool | None:
        tool = await self._inner_registry.get_tool_by_name(name, predefined_params)
        if tool is None:
            return None
        hidden = _hidden_property_names(predefined_params)
        return _wrap_tool(tool, hidden)


# ---------------------------------------------------------------------------
# Pure helper functions
# ---------------------------------------------------------------------------


def _hidden_property_names(predefined_params: dict[str, Any] | None) -> set[str]:
    """Derive the set of property names to hide from ``predefined_params`` keys.

    Each ``_``-prefixed key like ``_session_id`` maps to property name
    ``session_id``.  Keys without a leading ``_`` are ignored because they are
    not predefined variables.
    """
    if not predefined_params:
        return set()
    return {key[1:] for key in predefined_params if key.startswith("_")}


def _wrap_tool(tool: Tool, hidden_properties: set[str]) -> Tool:
    """Return a filtered wrapper around *tool*, or *tool* itself if nothing changes."""
    if not hidden_properties:
        return tool
    actually_hidden = _actually_hidden_properties(tool.definition, hidden_properties)
    if not actually_hidden:
        return tool
    filtered_definition = _filter_definition(tool.definition, actually_hidden)
    return _PredefinedVariablesTool(
        inner=tool,
        hidden_properties=actually_hidden,
        filtered_definition=filtered_definition,
    )


def _actually_hidden_properties(
    definition: ToolDefinition, candidates: set[str]
) -> set[str]:
    """Return only those candidate names that actually exist as schema properties."""
    properties = definition.parameters.get("properties", {})
    return {name for name in candidates if name in properties}


def _filter_definition(
    definition: ToolDefinition, hidden_properties: set[str]
) -> ToolDefinition:
    """Return a new :class:`ToolDefinition` with *hidden_properties* removed."""
    params = definition.parameters
    new_properties = {
        k: v
        for k, v in params.get("properties", {}).items()
        if k not in hidden_properties
    }
    new_required = [r for r in params.get("required", []) if r not in hidden_properties]
    new_params: dict[str, Any] = {**params, "properties": new_properties}
    if "required" in params:
        new_params["required"] = new_required
    return ToolDefinition(
        name=definition.name,
        description=definition.description,
        parameters=new_params,
    )
