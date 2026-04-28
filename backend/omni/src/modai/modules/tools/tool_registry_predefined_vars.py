"""Composing tool registry that hides pre-known variables from tool definitions.

``_extract_predefined_params`` builds a flat look-up dict from the incoming
request headers.  Every header is stored under two keys so that a simple
``prop in predefined_params`` (or ``prop.lower() in predefined_params``) is
sufficient at match time:

* The Starlette-lowercased, **hyphen** form: ``x-session-id``.
* The **underscore** form: ``x_session_id``.

Explicit ``variable_mappings`` are applied inside the same function: if the
named header is present its value is additionally stored under the target tool
param name (e.g. ``session_id``) so that it is treated exactly like any other
predefined value — no separate logic needed.

This module is a pure decorator/composite: it has no knowledge of URLs,
HTTP, or OpenAPI — all actual tool work is performed by the inner registry
supplied via the ``delegate_registry`` module dependency.
"""

from typing import Any

from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolDefinition, ToolRegistryModule


def _extract_predefined_params(
    request: Request,
    variable_mappings: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Build a flat look-up dict of predefined values from request headers.

    Each header is indexed under two keys (hyphen and underscore form) so that
    downstream code can match tool parameters with a plain ``in`` check:

    * ``x-session-id`` — Starlette-lowercased hyphen form.
    * ``x_session_id`` — underscore-normalised form.

    Explicit ``variable_mappings`` are applied here: if the source header is
    present, its value is also stored under the ``to_tool_parameter`` key so
    that explicit targets are treated the same as auto-matched ones.
    """
    result: dict[str, Any] = {}
    for header_name, value in request.headers.items():
        result[header_name] = value  # e.g. "x-session-id"
        result[header_name.replace("-", "_")] = value  # e.g. "x_session_id"

    for mapping in variable_mappings or []:
        var_name = mapping["from_modai_header"].lower()
        if var_name in result:
            result[mapping["to_tool_parameter"]] = result[var_name]

    return result


class PredefinedVariablesToolRegistryModule(ToolRegistryModule):
    """Tool registry decorator that strips pre-supplied variables from definitions.

    Wraps another :class:`~modai.modules.tools.module.ToolRegistryModule` and
    filters its tool definitions based on headers from the incoming request.
    Header ``X-Session-Id`` automatically fills both a tool parameter named
    ``x_session_id`` (underscore form) and one named ``X-Session-Id``
    (header form) — no configuration required.

    An explicit ``variable_mappings`` list is only needed when the tool
    parameter name cannot be derived from the header name by normalisation.

    Configuration:
        variable_mappings: optional list of mappings, each with
            ``from_modai_header`` (the request header name) and
            ``to_tool_parameter`` (the tool parameter name to fill).

    Module Dependencies:
        delegate_registry: the concrete :class:`ToolRegistryModule` that does
            the actual spec-fetching and HTTP invocation.

    Example config.yaml::

        modules:
          tool_registry:
            type: PredefinedVariablesToolRegistryModule
            module_dependencies:
              delegate_registry: openapi_registry
            config:
              variable_mappings:
                - from_modai_header: X-Session-Id
                  to_tool_parameter: session_id
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self._inner_registry: ToolRegistryModule = dependencies.get_module(
            "delegate_registry"
        )  # type: ignore[assignment]
        self._variable_mappings: list[dict[str, str]] = config.get(
            "variable_mappings", []
        )

    async def get_tools(self, request: Request) -> list[ToolDefinition]:
        tools = await self._inner_registry.get_tools(request)
        predefined_params = _extract_predefined_params(request, self._variable_mappings)
        return [
            _filter_tool_definition(definition, predefined_params)
            for definition in tools
        ]

    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        predefined_params = _extract_predefined_params(request, self._variable_mappings)
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
        schema = definition.get("parameters") or {}
        for prop in schema.get("properties", {}).keys():
            lookup = (
                prop
                if prop in predefined_params
                else prop.lower()
                if prop.lower() in predefined_params
                else None
            )
            if lookup is not None and prop not in translated_arguments:
                translated_arguments[prop] = predefined_params[lookup]

        translated_params["arguments"] = translated_arguments
        return await self._inner_registry.run_tool(request, translated_params)


def _filter_tool_definition(
    definition: ToolDefinition,
    predefined_params: dict[str, Any],
) -> ToolDefinition:
    parameters = definition.get("parameters") or {}
    hidden_properties = {
        prop
        for prop in parameters.get("properties", {}).keys()
        if prop in predefined_params or prop.lower() in predefined_params
    }
    if not hidden_properties:
        return definition

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
