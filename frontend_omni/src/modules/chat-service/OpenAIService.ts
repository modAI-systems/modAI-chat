import OpenAI from "openai";
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
            baseURL: provider.url,
            dangerouslyAllowBrowser: true,
        });

        try {
            const openaiMessages = previousMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            const allMessages = [
                ...openaiMessages,
                {
                    role: "user" as const,
                    content: message.trim(),
                },
            ];

            const stream = await openai.chat.completions.create({
                model: model.name,
                messages: allMessages,
                stream: true,
            });

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    yield {
                        type: MessagePartType.TEXT,
                        text: delta,
                    };
                }
            }
        } catch (error) {
            console.error("OpenAI API error:", error);
            throw error;
        }
    }
}
