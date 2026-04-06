import type { OpenAIFunctionTool, ToolsService } from "./index.svelte.js";

export class NoOpToolsService implements ToolsService {
    async fetchAvailableTools(): Promise<OpenAIFunctionTool[]> {
        return [];
    }
}

export function create(): ToolsService {
    return new NoOpToolsService();
}
