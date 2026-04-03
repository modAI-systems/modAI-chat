import type { OpenAIFunctionTool, ToolsService } from "./index.svelte.js";

export class EmptyToolsService implements ToolsService {
    async fetchAvailableTools(): Promise<OpenAIFunctionTool[]> {
        return [];
    }

    async fetchSelectedToolNames(): Promise<string[]> {
        return [];
    }

    async saveSelectedToolNames(): Promise<void> {}
}

export function create(): ToolsService {
    return new EmptyToolsService();
}
