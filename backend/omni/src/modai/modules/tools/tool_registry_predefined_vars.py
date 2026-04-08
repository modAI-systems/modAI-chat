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

from typing import Any

from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolDefinition, ToolRegistryModule


def _extract_predefined_params(request: Request) -> dict[str, Any]:
    """Extract predefined tool params from all request headers."""
    return {
        f"_{header_name.lower().replace('-', '_')}": value
        for header_name, value in request.headers.items()
    }


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

    async def get_tools(self, request: Request) -> list[ToolDefinition]:
        tools = await self._inner_registry.get_tools(request)
        predefined_params = _extract_predefined_params(request)
        return [
            _filter_tool_definition(
                definition, predefined_params, self._variable_mappings
            )
            for definition in tools
        ]

    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        predefined_params = _extract_predefined_params(request)
        name = params.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("Tool invocation requires a non-empty 'name'")

        tool_definitions = await self._inner_registry.get_tools(request)
        definition = next(
            (tool for tool in tool_definitions if tool["name"] == name), None
        )
        if definition is None:
            raise ValueError(f"Tool '{name}' not found")

        translated_params = dict(params)
        raw_arguments = translated_params.get("arguments", {})
        if not isinstance(raw_arguments, dict):
            raise ValueError("Tool invocation 'arguments' must be an object")

        translated_arguments = dict(raw_arguments)
        translations = _build_translations(
            definition=definition,
            predefined_params=predefined_params,
            variable_mappings=self._variable_mappings,
        )
        for tool_param, prefixed_key in translations.items():
            predefined_value = predefined_params.get(prefixed_key)
            if predefined_value is not None and tool_param not in translated_arguments:
                translated_arguments[tool_param] = predefined_value

        translated_params["arguments"] = translated_arguments
        return await self._inner_registry.run_tool(request, translated_params)


def _build_translations(
    definition: ToolDefinition,
    predefined_params: dict[str, Any],
    variable_mappings: dict[str, str],
) -> dict[str, str]:
    schema = definition.get("parameters") or {}
    schema_properties = set(schema.get("properties", {}).keys())
    translations: dict[str, str] = {}

    for prefixed_key in predefined_params:
        if not prefixed_key.startswith("_"):
            continue
        var_name = prefixed_key[1:]
        if var_name in schema_properties:
            translations[var_name] = prefixed_key

    for tool_param, var_name in variable_mappings.items():
        prefixed_key = f"_{var_name}"
        if prefixed_key not in predefined_params:
            continue
        if tool_param not in schema_properties:
            continue
        translations.pop(var_name, None)
        translations[tool_param] = prefixed_key

    return translations


def _filter_tool_definition(
    definition: ToolDefinition,
    predefined_params: dict[str, Any],
    variable_mappings: dict[str, str],
) -> ToolDefinition:
    translations = _build_translations(definition, predefined_params, variable_mappings)
    if not translations:
        return definition

    hidden_properties = set(translations.keys())
    parameters = definition.get("parameters") or {}
    new_properties = {
        k: v
        for k, v in parameters.get("properties", {}).items()
        if k not in hidden_properties
    }
    new_required = [
        r for r in parameters.get("required", []) if r not in hidden_properties
    ]

    new_parameters: dict[str, Any] = {**parameters, "properties": new_properties}
    if "required" in parameters:
        new_parameters["required"] = new_required

    filtered: ToolDefinition = {
        "type": "function",
        "name": definition["name"],
        "parameters": new_parameters,
        "strict": definition.get("strict", True),
    }
    if "description" in definition:
        filtered["description"] = definition.get("description")

    return filtered
