import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import type { Model, Provider } from "@/modules/llm-provider-service";
import type { ChatService, Message, MessagePart } from "./index";
import { MessagePartType } from "./index";

export class OpenAIChatService implements ChatService {
    async *sendMessage(
        provider: Provider,
        model: Model,
        message: string,
        previousMessages: Message[],
    ): AsyncIterable<MessagePart> {
        if (!message.trim()) return;

        const openai = new OpenAI({
            apiKey: provider.api_key,
            baseURL: provider.base_url,
            dangerouslyAllowBrowser: true,
        });

        try {
            const inputItems = previousMessages.map((msg) => ({
                type: "message",
                role: msg.role,
                content: [{ type: "text", text: msg.content }],
            }));

            inputItems.push({
                type: "message",
                role: "user",
                content: [{ type: "text", text: message.trim() }],
            });

            const stream = await openai.responses.create({
                model: model.name,
                input: inputItems as ResponseInput,
                stream: true,
            });

            for await (const event of stream) {
                if (
                    event.type === "response.output_text.delta" &&
                    event.delta
                ) {
                    yield {
                        type: MessagePartType.TEXT,
                        text: event.delta,
                    };
                }
            }
        } catch (error) {
            console.error("OpenAI API error:", error);
            throw error;
        }
    }
}
