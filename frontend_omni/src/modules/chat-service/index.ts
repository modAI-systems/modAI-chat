export const MessagePartType = {
    TEXT: "text",
    REASONING: "reasoning",
    SOURCE_URL: "source-url",
} as const;

export const MessageRole = {
    USER: "user",
    ASSISTANT: "assistant",
} as const;

export type MessagePartType =
    (typeof MessagePartType)[keyof typeof MessagePartType];

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export interface MessagePart {
    type: MessagePartType;
    text?: string;
    url?: string;
}

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
}

/**
 * Chat service interface for sending messages to LLMs.
 * The modelId is in the format: {provider_type}/{provider_name}/{model_id}
 */
export interface ChatService {
    sendMessage(
        modelId: string,
        message: string,
        previousMessages: Message[],
    ): AsyncIterable<MessagePart>;
}
