import type { ModuleDependencies } from "@/core/module-system/index.js";
import type {
    NoSessionAction,
    SessionService,
} from "@/modules/session-service/index.svelte.js";
import type { FetchService } from "./index.svelte.js";

export function create(deps: ModuleDependencies): FetchService {
    const sessionService = deps.getOne<SessionService>("sessionService");
    const noSessionAction = deps.getOne<NoSessionAction>("noSessionAction");
    return {
        async fetch(
            input: RequestInfo | URL,
            init?: RequestInit,
        ): Promise<Response> {
            const response = await fetch(input, {
                credentials: "include",
                ...init,
            });
            if (response.status === 401) {
                await sessionService.refresh();
                if (!sessionService.isSessionActive()) {
                    noSessionAction.execute();
                }
            }
            return response;
        },
    };
}
