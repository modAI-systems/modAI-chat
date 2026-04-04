import { createOpenAI } from "@ai-sdk/openai";
import {
    convertToModelMessages,
    jsonSchema,
    streamText,
    tool,
    type UIMessage,
} from "ai";
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
            fetch: this.#fetchService.fetch,
        });

        const result = streamText({
            model: openai(model.modelId),
            messages: await convertToModelMessages(messages),
            ...(tools.length > 0 && { tools: convertToAiSdkTools(tools) }),
        });

        for await (const textPart of result.textStream) {
            yield textPart;
        }
    }
}

function trimTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

function convertToAiSdkTools(openAiTools: OpenAIFunctionTool[]) {
    return Object.fromEntries(
        openAiTools.map((t) => [
            t.function.name,
            tool({
                description: t.function.description,
                parameters: jsonSchema(
                    (t.function.parameters ?? {
                        type: "object",
                        properties: {},
                    }) as object,
                ),
            }),
        ]),
    );
}

export function create(deps: ModuleDependencies): ChatService {
    return new OpenAIChatService(deps.getOne<FetchService>("fetchService"));
}
