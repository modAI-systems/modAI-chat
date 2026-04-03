import type { UIMessage } from "ai";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { OpenAIFunctionTool } from "@/modules/tools-service/index.svelte.js";

export type { ProviderModel };

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
        tools?: OpenAIFunctionTool[],
    ): AsyncGenerator<string, void, unknown>;
}
