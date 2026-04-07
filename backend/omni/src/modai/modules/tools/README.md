# Tools Module

## Interface

The abstract interface is defined in `module.py`.

- Module types:
  - `ToolRegistryModule` (plain module): resolves available tools and lookup by name.
  - `ToolsWebModule` (web module): exposes `GET /api/tools`.
- Public contract for callers:
  - `get_tools(predefined_params: dict[str, Any] | None = None) -> list[Tool]`
  - `get_tool_by_name(name: str, predefined_params: dict[str, Any] | None = None) -> Tool | None`
  - `Tool.definition` returns LLM-agnostic tool metadata.
  - `Tool.run(params)` executes the tool and returns implementation-specific output.

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

## PredefinedVariablesToolRegistryModule

Purpose: wraps another registry and hides caller-predefined `_`-prefixed parameters from tool definitions, then re-injects them on execution.

Class used in config:
- `modai.modules.tools.tool_registry_predefined_vars.PredefinedVariablesToolRegistryModule`

```yaml
modules:
  tool_registry:
    class: modai.modules.tools.tool_registry_predefined_vars.PredefinedVariablesToolRegistryModule
    module_dependencies:
      delegate_registry: "openapi_tool_registry"
    config:
      variable_mappings:
        X-Session-Id: session_id
```

Supported config keys:
- `variable_mappings` (optional dict): maps tool parameter name to predefined variable name without leading underscore.

## OpenAIToolsWebModule

Purpose: exposes `GET /api/tools` in OpenAI function-calling format.

Class used in config:
- `modai.modules.tools.tools_web_module.OpenAIToolsWebModule`

```yaml
modules:
  tools_web:
    class: modai.modules.tools.tools_web_module.OpenAIToolsWebModule
    module_dependencies:
      tool_registry: "tool_registry"
```

Supported config keys:
- none.
