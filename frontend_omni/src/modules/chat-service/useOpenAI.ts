import { useCallback, useMemo } from "react";
import OpenAI from "openai";
import type { Message, MessagePart, ChatService } from "./index";
import { MessagePartType } from "./index";

export function useOpenAI(apiKey: string, baseURL: string): ChatService | null {
    const openai = useMemo(() => {
        if (!apiKey || !baseURL) {
            return null;
        }

        return new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
            dangerouslyAllowBrowser: true, // Since this is frontend
        });
    }, [apiKey, baseURL]);

    const sendMessage = useCallback(
        async function* (
            message: string,
            options: { model: string },
            previousMessages: Message[],
        ): AsyncIterable<MessagePart> {
            if (!message.trim()) return;

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

                const stream = await openai!.chat.completions.create({
                    model: options.model,
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
        },
        [openai],
    );

    if (openai == null) {
        return null;
    }

    return {
        sendMessage,
    };
}
