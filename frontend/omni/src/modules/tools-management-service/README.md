# Tools Management Service

Fetches available tools from the backend and manages tool selection state.
Persists selected tools to `localStorage`. No UI components available in this module group.

## Intended Usage

Other modules retrieve the tool service via `getToolService()` and use it to access available tools and the current selection.

```svelte
<script lang="ts">
  import { getToolService } from "@/modules/tools-management-service/index.svelte.js";

  const toolService = getToolService();  // called at component init

  await toolService.fetchTools();
  const selected = toolService.selectedTools;
</script>
```

Modules that consume this service must declare a `module:tools-management-service` dependency in `modules*.json`.

## API

### Properties

- `tools: OpenAITool[]` — reactive list of all available tools
- `selectedToolNames: Set<string>` — names of currently selected tools
- `loading: boolean` — whether a fetch is in progress
- `error: string | null` — last error message, if any
- `selectedTools: OpenAITool[]` (readonly) — filtered list of currently selected tools

### Methods

- `fetchTools(): Promise<void>` — fetch available tools from the `/api/tools` backend endpoint
- `toggleTool(name: string): void` — toggle a tool's selection state

## Intended Integration

The service is registered and discovered automatically by the module system. The default implementation (`openai.svelte.ts`) fetches tools from the backend. To swap it, register a different implementation in `modules*.json`:

```json
{
  "id": "tools-management-service",
  "type": "ToolsManagementService",
  "path": "@/modules/tools-management-service/openai",
  "dependencies": []
}
```
