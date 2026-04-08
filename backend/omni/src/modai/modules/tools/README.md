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
