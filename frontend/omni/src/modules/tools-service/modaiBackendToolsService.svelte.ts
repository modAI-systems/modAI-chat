import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { OpenAIFunctionTool, ToolsService } from "./index.svelte.js";

const API_BASE = "/api/tools";

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
}

export function create(deps: ModuleDependencies): ToolsService {
    return new ModaiBackendToolsService(
        deps.getOne<FetchService>("fetchService"),
    );
}
