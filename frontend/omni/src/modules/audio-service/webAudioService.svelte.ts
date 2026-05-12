import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type {
    AudioService,
    RealtimeMessageCallback,
    RealtimeSession,
} from "./index.svelte.js";
import { createRealtimeSession } from "./realtimeSession.svelte.js";

export function create(_deps: ModuleDependencies): AudioService {
    return {
        createSession(
            model: () => ProviderModel | null,
            transcriptModel: () => ProviderModel | null,
            onMessage: RealtimeMessageCallback,
        ): RealtimeSession {
            return createRealtimeSession(model, transcriptModel, onMessage);
        },
    };
}
