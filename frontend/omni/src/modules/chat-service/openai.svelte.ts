import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { OpenAIFunctionTool } from "@/modules/tools-service/index.svelte.js";
import type { ChatService } from "./index.svelte.js";

class OpenAIChatService implements ChatService {
    readonly #fetchService: FetchService;

    constructor(fetchService: FetchService) {
        this.#fetchService = fetchService;
    }

    async *streamChat(
        model: ProviderModel,
        messages: UIMessage[],
        tools: OpenAIFunctionTool[] = [],
    ): AsyncGenerator<string, void, unknown> {
        const openai = createOpenAI({
            baseURL: trimTrailingSlash(model.providerBaseUrl),
            apiKey: model.providerApiKey,
            fetch: (url, options) => {
                const patchedOptions = patchResponsesRequestBodyWithTools(
                    url,
                    options,
                    tools,
                );
                return this.#fetchService.fetch(url, patchedOptions);
            },
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

function patchResponsesRequestBodyWithTools(
    url: RequestInfo | URL,
    options: RequestInit | undefined,
    tools: OpenAIFunctionTool[],
): RequestInit | undefined {
    if (tools.length === 0) {
        return options;
    }

    const pathname = resolvePathname(url);
    if (!pathname.endsWith("/responses")) {
        return options;
    }

    if (!options?.body || typeof options.body !== "string") {
        return options;
    }

    try {
        const payload = JSON.parse(options.body) as Record<string, unknown>;
        payload.tools = tools;
        return {
            ...options,
            body: JSON.stringify(payload),
        };
    } catch {
        return options;
    }
}

function resolvePathname(url: RequestInfo | URL): string {
    if (url instanceof Request) {
        return resolvePathname(url.url);
    }

    if (url instanceof URL) {
        return url.pathname;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return new URL(url).pathname;
    }

    return url;
}

export function create(deps: ModuleDependencies): ChatService {
    return new OpenAIChatService(deps.getOne<FetchService>("fetchService"));
}
