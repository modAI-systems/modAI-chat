import type { UIMessage } from "ai";
import type { RealtimeMessageCallback } from "@/modules/audio-service/index.svelte.js";
import type { ChatService } from "@/modules/chat-service/index.svelte.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { OpenAIFunctionTool } from "@/modules/tools-service/index.svelte.js";

export function createChatMessages(chatService: ChatService) {
    let messages = $state<UIMessage<{ modelName?: string }>[]>([]);
    let chatStatus = $state<"ready" | "submitted" | "streaming">("ready");
    const isIdle = $derived(
        chatStatus !== "streaming" && chatStatus !== "submitted",
    );

    function makeMessageId(): string {
        return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    const streamingIds: Record<"user" | "assistant", string | null> = {
        user: null,
        assistant: null,
    };

    // User transcripts arrive late (after assistant has already responded).
    // When the assistant starts a new turn, pre-create a user placeholder
    // before the assistant message so ordering is correct in the UI.
    const pendingUserIds: string[] = [];

    const realtimeCallbacks: RealtimeMessageCallback = {
        onDelta(role, delta) {
            let id = streamingIds[role];
            if (!id) {
                if (role === "assistant") {
                    // Pre-insert user placeholder first, then assistant message
                    const userId = makeMessageId();
                    pendingUserIds.push(userId);
                    id = makeMessageId();
                    streamingIds.assistant = id;
                    messages = [
                        ...messages,
                        {
                            id: userId,
                            role: "user",
                            parts: [{ type: "text", text: "" }],
                        },
                        {
                            id,
                            role: "assistant",
                            parts: [{ type: "text", text: "" }],
                        },
                    ];
                } else {
                    // Fill in the pending placeholder if one was pre-created
                    const pendingId = pendingUserIds.shift();
                    if (pendingId) {
                        id = pendingId;
                        streamingIds.user = id;
                    } else {
                        id = makeMessageId();
                        streamingIds.user = id;
                        messages = [
                            ...messages,
                            {
                                id,
                                role: "user",
                                parts: [{ type: "text", text: "" }],
                            },
                        ];
                    }
                }
            }
            messages = messages.map((m) => {
                if (m.id !== id) return m;
                const prev = m.parts.find((p) => p.type === "text")?.text ?? "";
                return { ...m, parts: [{ type: "text", text: prev + delta }] };
            });
        },
        onDone(role) {
            if (role === "user") {
                const id = streamingIds.user ?? pendingUserIds.shift();
                if (id) {
                    const text =
                        messages
                            .find((m) => m.id === id)
                            ?.parts.find((p) => p.type === "text")?.text ?? "";
                    if (!text) {
                        messages = messages.filter((m) => m.id !== id);
                    }
                }
            } else if (role === "assistant") {
                // If no user transcript arrived for this turn, remove the placeholder
                const pendingId = pendingUserIds.shift();
                if (pendingId && streamingIds.user === null) {
                    messages = messages.filter((m) => m.id !== pendingId);
                }
            }
            streamingIds[role] = null;
        },
    };

    async function handleSend(
        text: string,
        selectedModelData: ProviderModel | undefined,
        tools: OpenAIFunctionTool[],
    ) {
        if (!selectedModelData) return;

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
                metadata: { modelName: selectedModelData.modelName },
            },
        ];
        chatStatus = "submitted";

        try {
            chatStatus = "streaming";
            for await (const textPart of chatService.streamChat(
                selectedModelData,
                conversationForModel,
                tools,
            )) {
                messages = messages.map((message) => {
                    if (
                        message.id !== assistantMessageId ||
                        message.role !== "assistant"
                    )
                        return message;
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
                )
                    return message;
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
            chatStatus = "ready";
        }
    }

    return {
        get messages() {
            return messages;
        },
        get chatStatus() {
            return chatStatus;
        },
        get isIdle() {
            return isIdle;
        },
        realtimeCallbacks,
        handleSend,
    };
}
