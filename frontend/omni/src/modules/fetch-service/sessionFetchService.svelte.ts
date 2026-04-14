import type { ModuleDependencies } from "@/core/module-system/index.js";
import type {
    NoSessionAction,
    SessionService,
} from "@/modules/session-service/index.svelte.js";
import type { FetchService } from "./index.svelte.js";

export function create(deps: ModuleDependencies): FetchService {
    const fetchService = deps.getOne<FetchService>("fetchService");
    const sessionService = deps.getOne<SessionService>("sessionService");
    const noSessionAction = deps.getOne<NoSessionAction>("noSessionAction");
    return {
        async fetch(
            input: RequestInfo | URL,
            init?: RequestInit,
        ): Promise<Response> {
            const response = await fetchService.fetch(input, {
                credentials: "include",
                ...init,
            });
            if (response.status === 401) {
                const { active } = await sessionService.getActiveSession();
                if (!active) {
                    noSessionAction.execute();
                }
            }
            return response;
        },
    };
}
