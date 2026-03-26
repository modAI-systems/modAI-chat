import type { UIMessage } from "ai";
import { getChatService } from "@/modules/chat-service/index.svelte.ts";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.ts";
import type { Tool } from "@/modules/tools-management-service/index.svelte.ts";
import type {
    ChatStatus,
    Conversation,
    ConversationService,
} from "./index.svelte.ts";

class OpenAIConversationService implements ConversationService {
    createConversation(): Conversation {
        const chatService = getChatService();
        let messages = $state.raw<UIMessage[]>([]);
        let status = $state<ChatStatus>("ready");

        async function send(
            text: string,
            model: ProviderModel,
            tools?: Tool[],
        ) {
            const userMessage: UIMessage = {
                id: makeMessageId(),
                role: "user",
                parts: [{ type: "text", text }],
            };
            const assistantMessageId = makeMessageId();
            const conversationForModel = [...messages, userMessage];
            messages = [
                ...conversationForModel,
                {
                    id: assistantMessageId,
                    role: "assistant",
                    parts: [{ type: "text", text: "" }],
                },
            ];
            status = "submitted";

            try {
                status = "streaming";
                for await (const textPart of chatService.streamChat(
                    model,
                    conversationForModel,
                    tools,
                )) {
                    messages = messages.map((message) => {
                        if (
                            message.id !== assistantMessageId ||
                            message.role !== "assistant"
                        ) {
                            return message;
                        }
                        const previousText =
                            message.parts.find((part) => part.type === "text")
                                ?.text ?? "";
                        return {
                            ...message,
                            parts: [
                                {
                                    type: "text",
                                    text: `${previousText}${textPart}`,
                                },
                            ],
                        };
                    });
                }
            } catch {
                messages = messages.map((message) => {
                    if (
                        message.id !== assistantMessageId ||
                        message.role !== "assistant"
                    ) {
                        return message;
                    }
                    return {
                        ...message,
                        parts: [
                            {
                                type: "text",
                                text: "Could not reach the selected provider. Check URL, API key, and CORS settings.",
                            },
                        ],
                    };
                });
            } finally {
                status = "ready";
            }
        }

        return {
            get messages() {
                return messages;
            },
            get status() {
                return status;
            },
            send,
        };
    }
}

export default new OpenAIConversationService();

function makeMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
