import type { UIMessage } from "ai";
import { getModules } from "@/core/module-system/index.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { OpenAITool } from "@/modules/tools-management-service/index.svelte.js";

export type { ProviderModel, OpenAITool };

/**
 * The module type registered in modules*.json for the chat service.
 * Used by consumers: getModules().getOne<ChatService>("ChatService")
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
        model: ProviderModel,
        messages: UIMessage[],
        tools?: OpenAITool[],
    ): AsyncGenerator<string, void, unknown>;
}

/**
 * Returns the active ChatService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getChatService(): ChatService {
    const service = getModules().getOne<ChatService>(CHAT_SERVICE_TYPE);
    if (!service) {
        throw new Error("ChatService module not registered");
    }
    return service;
}
