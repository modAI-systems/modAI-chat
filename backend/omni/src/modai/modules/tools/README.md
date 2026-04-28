# Tools Module

## Interface

The abstract interface is defined in `module.py`.

- Module types:
  - `ToolRegistryModule` (plain module): resolves available tools and executes tool calls.
- Public contract for callers:
  - `get_tools(request: Request) -> list[ToolDefinition]`
  - `run_tool(request: Request, params: dict[str, Any]) -> Any`
  - `ToolDefinition` uses OpenAI Responses API format (`FunctionToolParam`).

## OpenAPIToolRegistryModule

Purpose: discovers tools from OpenAPI servers and invokes each operation over HTTP.

Class used in config:
- `modai.modules.tools.tool_registry_openapi.OpenAPIToolRegistryModule`

```yaml
modules:
  openapi_tool_registry:
    class: modai.modules.tools.tool_registry_openapi.OpenAPIToolRegistryModule
    module_dependencies:
      http_client: "http_client"
    config:
      tool_servers:
        - url: http://localhost:8001/openapi.json
```

Supported config keys:
- `tool_servers` (required list): list of objects with `url` (OpenAPI spec URL).

Module dependencies:
- `http_client`

## ToolsRouterModule

Purpose: aggregate multiple `ToolRegistryModule` implementations behind one public endpoint and dispatch runtime tool calls.

Class used in config:
- `modai.modules.tools.tool_router.ToolsRouterModule`

```yaml
modules:
  openapi_tool_registry:
    class: modai.modules.tools.tool_registry_openapi.OpenAPIToolRegistryModule
    module_dependencies:
      http_client: "http_client"
    config:
      tool_servers:
        - url: http://localhost:8001/openapi.json

  tool_registry:
    class: modai.modules.tools.tool_router.ToolsRouterModule
    module_dependencies:
      openapi: "openapi_tool_registry"
```

Supported config keys:
- none

Module dependencies:
- one or more `ToolRegistryModule` implementations (named freely in `module_dependencies`)

Behavior:
- Exposes `GET /api/tools`.
- Returns tool names as provided by underlying registries (no prefixing).
- On `run_tool`, routes to the registry that provides the requested tool name.
- If multiple registries provide the same tool name, invocation fails with an ambiguity error.

## PredefinedVariablesToolRegistryModule

Purpose: wraps another `ToolRegistryModule` and automatically hides tool parameters whose values are already known from request headers, so the AI never sees or fills them.

Class used in config:
- `modai.modules.tools.tool_registry_predefined_vars.PredefinedVariablesToolRegistryModule`

Every incoming request header is normalised (lowercased, hyphens replaced with underscores) and matched against tool parameter names. A tool parameter is hidden and auto-filled if:
- its name equals the normalised header name (e.g. `x_session_id` ← header `X-Session-Id`), **or**
- its name normalises to the same value (e.g. `X-Session-Id` ← header `X-Session-Id`)

No configuration is needed for either case. `variable_mappings` is only required when the tool parameter name cannot be derived from the header name by normalisation (e.g. tool expects `session_id` from header `X-Session-Id`).

```yaml
modules:
  predefined_tool_registry:
    class: modai.modules.tools.tool_registry_predefined_vars.PredefinedVariablesToolRegistryModule
    module_dependencies:
      delegate_registry: "openapi_tool_registry"
    config:
      # Optional — only needed when the tool param name cannot be derived from the header:
      # variable_mappings:
      #   - from_modai_header: X-Session-Id
      #     to_tool_parameter: session_id
```

Supported config keys:
- `variable_mappings` (optional list): each entry has `from_modai_header` (request header name) and `to_tool_parameter` (tool parameter name to fill).

Module dependencies:
- `delegate_registry`: the `ToolRegistryModule` to wrap
