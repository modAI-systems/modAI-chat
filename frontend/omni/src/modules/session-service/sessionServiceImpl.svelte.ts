import type { Modules } from "@/core/module-system/index.js";
import {
    FETCH_SERVICE_TYPE,
    type FetchService,
} from "@/modules/fetch-service/index.svelte.js";
import type { SessionService } from "./index.svelte.js";

class SessionServiceImpl implements SessionService {
    #sessionActive = false;

    async refresh(modules: Modules): Promise<void> {
        try {
            const fetchService =
                modules.getOne<FetchService>(FETCH_SERVICE_TYPE);
            if (!fetchService)
                throw new Error("FetchService module not registered");
            const response = await fetchService.fetch(
                modules,
                "/api/auth/session",
            );
            const data = (await response.json()) as { authenticated: boolean };
            this.#sessionActive = data.authenticated;
        } catch {
            this.#sessionActive = false;
        }
    }

    isSessionActive(_modules: Modules): boolean {
        return this.#sessionActive;
    }
}

export default new SessionServiceImpl();
