import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { ChatService } from "./index.svelte.js";

class OpenAIChatService implements ChatService {
    readonly #fetchService: FetchService;

    constructor(fetchService: FetchService) {
        this.#fetchService = fetchService;
    }

    async *streamChat(
        model: ProviderModel,
        messages: UIMessage[],
    ): AsyncGenerator<string, void, unknown> {
        const openai = createOpenAI({
            baseURL: trimTrailingSlash(model.providerBaseUrl),
            apiKey: model.providerApiKey,
            fetch: (url, options) => this.#fetchService.fetch(url, options),
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

export function create(deps: ModuleDependencies): ChatService {
    return new OpenAIChatService(deps.getOne<FetchService>("fetchService"));
}
