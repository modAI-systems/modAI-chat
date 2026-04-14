import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { SessionService, SessionState, UserInfo } from "./index.svelte.js";

class SessionServiceImpl implements SessionService {
    readonly #fetchService: FetchService;

    constructor(fetchService: FetchService) {
        this.#fetchService = fetchService;
    }

    async getActiveSession(): Promise<SessionState> {
        try {
            const response =
                await this.#fetchService.fetch("/api/auth/userinfo");
            if (response.ok) {
                const data = await response.json();
                const userInfo: UserInfo = {
                    user_id: data.user_id,
                    name: data.additional?.name ?? null,
                };
                return { active: true, userInfo };
            }
            return { active: false, userInfo: null };
        } catch {
            return { active: false, userInfo: null };
        }
    }
}

export function create(deps: ModuleDependencies): SessionService {
    return new SessionServiceImpl(deps.getOne<FetchService>("fetchService"));
}
