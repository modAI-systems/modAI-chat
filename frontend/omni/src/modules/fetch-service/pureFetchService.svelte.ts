import type { FetchService } from "./index.svelte.js";

class PureFetchService implements FetchService {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        return fetch(input, init);
    }
}

export function create(): FetchService {
    return new PureFetchService();
}
