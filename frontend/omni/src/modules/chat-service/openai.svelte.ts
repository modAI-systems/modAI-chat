import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Modules } from "@/core/module-system/index.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { ChatService } from "./index.svelte.js";

class OpenAIChatService implements ChatService {
    async *streamChat(
        _modules: Modules,
        model: ProviderModel,
        messages: UIMessage[],
    ): AsyncGenerator<string, void, unknown> {
        const openai = createOpenAI({
            baseURL: trimTrailingSlash(model.providerBaseUrl),
            apiKey: model.providerApiKey,
        });

        const result = streamText({
            model: openai(model.modelId),
            messages: await convertToModelMessages(messages),
        });

        for await (const textPart of result.textStream) {
            yield textPart;
        }
    }
}

function trimTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default new OpenAIChatService();
