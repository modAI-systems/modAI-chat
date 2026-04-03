# Tools Service

Provides the public `ToolsService` contract used by the frontend to:

- load available tools from the backend (`GET /api/tools`)
- persist selected tool names for chat requests

Implementations:

- `modaiBackendToolsService.svelte.ts` for backend-connected setups
- `emptyToolsService.svelte.ts` for browser-only mode without modAI backend
