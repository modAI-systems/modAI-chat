import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { OpenAIFunctionTool, ToolsService } from "./index.svelte.js";

const API_BASE = "/api/tools";
const SELECTED_TOOLS_STORAGE_KEY = "modai.selected.tools";

type BackendToolsResponse = {
    tools: OpenAIFunctionTool[];
};

export class ModaiBackendToolsService implements ToolsService {
    readonly #fetchService: FetchService;

    constructor(fetchService: FetchService) {
        this.#fetchService = fetchService;
    }

    async fetchAvailableTools(): Promise<OpenAIFunctionTool[]> {
        const response = await this.#fetchService.fetch(API_BASE);
        if (!response.ok) {
            return [];
        }

        const data = (await response.json()) as BackendToolsResponse;
        return data.tools ?? [];
    }

    async fetchSelectedToolNames(): Promise<string[]> {
        return readSelectedToolsFromStorage();
    }

    async saveSelectedToolNames(toolNames: string[]): Promise<void> {
        const uniqueToolNames = [...new Set(toolNames)];
        localStorage.setItem(
            SELECTED_TOOLS_STORAGE_KEY,
            JSON.stringify(uniqueToolNames),
        );
    }
}

function readSelectedToolsFromStorage(): string[] {
    const rawValue = localStorage.getItem(SELECTED_TOOLS_STORAGE_KEY);
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (name): name is string => typeof name === "string",
        );
    } catch {
        return [];
    }
}

export function create(deps: ModuleDependencies): ToolsService {
    return new ModaiBackendToolsService(
        deps.getOne<FetchService>("fetchService"),
    );
}
