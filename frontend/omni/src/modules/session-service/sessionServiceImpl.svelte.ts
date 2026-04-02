import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { SessionService } from "./index.svelte.js";

class SessionServiceImpl implements SessionService {
    readonly #fetchService: FetchService;
    #sessionActive = false;

    constructor(fetchService: FetchService) {
        this.#fetchService = fetchService;
    }

    async refresh(): Promise<void> {
        try {
            const response =
                await this.#fetchService.fetch("/api/auth/session");
            this.#sessionActive = response.ok;
        } catch {
            this.#sessionActive = false;
        }
    }

    isSessionActive(): boolean {
        return this.#sessionActive;
    }
}

export function create(deps: ModuleDependencies): SessionService {
    return new SessionServiceImpl(deps.getOne<FetchService>("fetchService"));
}
