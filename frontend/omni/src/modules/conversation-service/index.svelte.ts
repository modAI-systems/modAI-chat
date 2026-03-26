import type { UIMessage } from "ai";
import { getModules } from "@/core/module-system/index.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.ts";
import type { Tool } from "@/modules/tools-management-service/index.svelte.ts";

export type ChatStatus = "ready" | "submitted" | "streaming";

export interface Conversation {
    readonly messages: UIMessage[];
    readonly status: ChatStatus;
    send(text: string, model: ProviderModel, tools?: Tool[]): Promise<void>;
}

export const CONVERSATION_SERVICE_TYPE = "ConversationService";

export interface ConversationService {
    createConversation(): Conversation;
}

export function getConversationService(): ConversationService {
    const service = getModules().getOne<ConversationService>(
        CONVERSATION_SERVICE_TYPE,
    );
    if (!service) {
        throw new Error("ConversationService module not registered");
    }
    return service;
}
