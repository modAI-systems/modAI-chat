import type { Modules } from "@/core/module-system/index.js";
import type { FetchService } from "./index.svelte.js";

class PureFetchService implements FetchService {
    fetch(
        _modules: Modules,
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response> {
        return fetch(input, init);
    }
}

export default new PureFetchService();
