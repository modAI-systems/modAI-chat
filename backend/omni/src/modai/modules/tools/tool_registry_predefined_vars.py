"""Composing tool registry that hides pre-known variables from tool definitions.

A caller of the tool registry may already have values for certain tool
parameters (e.g. ``_session_id``, ``_bearer_token``).  By passing these as
``predefined_params`` to :meth:`get_tools` / :meth:`get_tool_by_name`, the
``PredefinedVariablesToolRegistryModule`` removes the corresponding properties
from each tool's definition so the LLM is never asked to supply them.

By default a predefined key ``_session_id`` maps to the tool parameter named
``session_id`` (underscore stripped).  A ``variable_mappings`` config section
lets you override this for any tool parameter whose name differs from the
predefined variable name — for example mapping ``X-Session-Id`` to
``session_id``.

At invocation time predefined values are re-injected, translating each
prefixed predefined key to its tool parameter name, before delegating to the
inner tool so URL-path substitution and body serialisation work as normal.

This module is a pure decorator/composite: it has no knowledge of URLs,
HTTP, or OpenAPI — all actual tool work is performed by the inner registry
supplied via the ``delegate_registry`` module dependency.
"""

import logging
from typing import Any

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)


class _PredefinedVariablesTool(Tool):
    """Wraps an inner Tool, hiding known variables from its public definition.

    ``translations`` is a mapping of ``tool_param_name → prefixed_predefined_key``
    (e.g. ``{"X-Session-Id": "_session_id"}``).  In :meth:`run` each prefixed
    key is popped from ``params`` and re-injected under its tool parameter name
    before the call is forwarded to the inner tool.
    """

    def __init__(
        self,
        inner: Tool,
        translations: dict[str, str],
        filtered_definition: ToolDefinition,
    ) -> None:
        self._inner = inner
        self._translations = translations
        self._filtered_definition = filtered_definition

    @property
    def definition(self) -> ToolDefinition:
        return self._filtered_definition

    async def run(self, params: dict[str, Any]) -> Any:
        """Forward to inner tool, substituting predefined values into their tool param names."""
        translated = dict(params)
        for tool_param, prefixed_key in self._translations.items():
            if prefixed_key in translated:
                translated[tool_param] = translated.pop(prefixed_key)
        return await self._inner.run(translated)


class PredefinedVariablesToolRegistryModule(ToolRegistryModule):
    """Tool registry decorator that strips pre-supplied variables from definitions.

    Wraps another :class:`~modai.modules.tools.module.ToolRegistryModule` and
    filters its tool definitions based on ``predefined_params`` passed by the
    caller.  By default a predefined key like ``_session_id`` hides the tool
    parameter ``session_id`` (leading ``_`` stripped).  The optional
    ``variable_mappings`` config allows overriding this for tool parameters
    whose names differ from the predefined variable name.

    At run time each hidden parameter is supplied from its predefined value
    before delegating to the inner tool.

    Configuration:
        variable_mappings: optional dict mapping tool parameter names to
            predefined variable names (without the leading ``_``).  Use this
            when a tool parameter name differs from the predefined variable
            name.

    Module Dependencies:
        delegate_registry: the concrete :class:`ToolRegistryModule` that does
            the actual spec-fetching and HTTP invocation.

    Example config.yaml::

        modules:
          openapi_registry:
            type: OpenAPIToolRegistryModule
            ...

          tool_registry:
            type: PredefinedVariablesToolRegistryModule
            module_dependencies:
              delegate_registry: openapi_registry
            config:
              variable_mappings:
                X-Session-Id: session_id   # _session_id fills X-Session-Id header
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self._inner_registry: ToolRegistryModule = dependencies.get_module(
            "delegate_registry"
        )  # type: ignore[assignment]
        self._variable_mappings: dict[str, str] = config.get("variable_mappings", {})

    async def get_tools(
        self, predefined_params: dict[str, Any] | None = None
    ) -> list[Tool]:
        tools = await self._inner_registry.get_tools()
        return [
            _wrap_tool(tool, predefined_params, self._variable_mappings)
            for tool in tools
        ]

    async def get_tool_by_name(
        self, name: str, predefined_params: dict[str, Any] | None = None
    ) -> Tool | None:
        tool = await self._inner_registry.get_tool_by_name(name)
        if tool is None:
            return None
        return _wrap_tool(tool, predefined_params, self._variable_mappings)


# ---------------------------------------------------------------------------
# Pure helper functions
# ---------------------------------------------------------------------------


def _build_translations(
    definition: ToolDefinition,
    predefined_params: dict[str, Any] | None,
    variable_mappings: dict[str, str],
) -> dict[str, str]:
    """Build a ``tool_param → prefixed_predefined_key`` map for *definition*.

    Only includes entries where:
    - the prefixed predefined key is present in ``predefined_params``, AND
    - the target tool parameter exists in the definition's schema properties.

    Direct mappings (``_session_id`` → ``session_id``) are derived
    automatically from ``predefined_params``.  ``variable_mappings`` entries
    (``X-Session-Id: session_id``) override the direct mapping for the same
    predefined variable so the value is routed to the correct tool parameter.
    """
    if not predefined_params:
        return {}

    schema_properties = set(definition.parameters.get("properties", {}).keys())
    translations: dict[str, str] = {}

    # Direct: _session_id → session_id (when session_id is in the schema)
    for prefixed_key in predefined_params:
        if not prefixed_key.startswith("_"):
            continue
        var_name = prefixed_key[1:]
        if var_name in schema_properties:
            translations[var_name] = prefixed_key

    # Configured: X-Session-Id ← _session_id (overrides the direct mapping)
    for tool_param, var_name in variable_mappings.items():
        prefixed_key = f"_{var_name}"
        if prefixed_key not in predefined_params:
            continue
        if tool_param not in schema_properties:
            continue
        # Remove default direct mapping for var_name if it was added above
        translations.pop(var_name, None)
        translations[tool_param] = prefixed_key

    return translations


def _wrap_tool(
    tool: Tool,
    predefined_params: dict[str, Any] | None,
    variable_mappings: dict[str, str],
) -> Tool:
    """Return a filtered wrapper around *tool*, or *tool* itself if nothing to hide."""
    translations = _build_translations(
        tool.definition, predefined_params, variable_mappings
    )
    if not translations:
        return tool
    hidden = set(translations.keys())
    filtered_definition = _filter_definition(tool.definition, hidden)
    return _PredefinedVariablesTool(
        inner=tool,
        translations=translations,
        filtered_definition=filtered_definition,
    )


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
