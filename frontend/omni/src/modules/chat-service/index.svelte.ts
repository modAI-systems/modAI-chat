import type { UIMessage } from "ai";
import type { Modules } from "@/core/module-system/index.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";

export type { ProviderModel };

/**
 * The module type registered in modules*.json for the chat service.
 * Used by consumers: modules.getOne<ChatService>(CHAT_SERVICE_TYPE)
 */
export const CHAT_SERVICE_TYPE = "ChatService";

/**
 * Public interface for the chat service.
 * Implementations live in sibling files (e.g. openai.svelte.ts).
 */
export interface ChatService {
    /**
     * Streams the assistant response for the given conversation.
     * Yields text deltas as they arrive from the provider.
     *
     * @throws When the provider is unreachable or returns an error.
     */
    streamChat(
        modules: Modules,
        model: ProviderModel,
        messages: UIMessage[],
    ): AsyncGenerator<string, void, unknown>;
}
