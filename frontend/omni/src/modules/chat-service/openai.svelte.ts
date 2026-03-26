import { createOpenAI } from "@ai-sdk/openai";
import {
    convertToModelMessages,
    jsonSchema,
    streamText,
    tool,
    type UIMessage,
} from "ai";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.ts";
import type { OpenAITool } from "@/modules/tools-management-service/index.svelte.ts";
import type { ChatService } from "./index.svelte.ts";

class OpenAIChatService implements ChatService {
    async *streamChat(
        model: ProviderModel,
        messages: UIMessage[],
        tools?: OpenAITool[],
    ): AsyncGenerator<string, void, unknown> {
        const openai = createOpenAI({
            baseURL: trimTrailingSlash(model.providerBaseUrl),
            apiKey: model.providerApiKey,
        });

        const result = streamText({
            model: openai(model.modelId),
            messages: await convertToModelMessages(messages),
            tools: buildToolsParam(tools),
        });

        for await (const textPart of result.textStream) {
            yield textPart;
        }
    }
}

function buildToolsParam(
    tools?: OpenAITool[],
): Record<string, ReturnType<typeof tool>> | undefined {
    if (!tools || tools.length === 0) return undefined;
    const result: Record<string, ReturnType<typeof tool>> = {};
    for (const t of tools) {
        result[t.function.name] = tool({
            description: t.function.description,
            inputSchema: jsonSchema(t.function.parameters),
        });
    }
    return result;
}

function trimTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default new OpenAIChatService();
