import type { Modules } from "@/core/module-system/index.js";
import {
    NO_SESSION_ACTION_TYPE,
    type NoSessionAction,
    SESSION_SERVICE_TYPE,
    type SessionService,
} from "@/modules/session-service/index.svelte.js";
import type { FetchService } from "./index.svelte.js";

class SessionFetchService implements FetchService {
    async fetch(
        modules: Modules,
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response> {
        const response = await fetch(input, {
            credentials: "include",
            ...init,
        });
        if (response.status === 401) {
            const sessionService =
                modules.getOne<SessionService>(SESSION_SERVICE_TYPE);
            if (sessionService) {
                await sessionService.refresh(modules);
                if (!sessionService.isSessionActive(modules)) {
                    const noSessionAction = modules.getOne<NoSessionAction>(
                        NO_SESSION_ACTION_TYPE,
                    );
                    noSessionAction?.execute(modules);
                }
            }
        }
        return response;
    }
}

export default new SessionFetchService();
