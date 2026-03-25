<script lang="ts">
import type { UIMessage } from "ai";
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";
import { getChatService } from "@/modules/chat-service/index.svelte.js";
import {
    llmProviderService,
    type ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import { getToolService } from "@/modules/tools-management-service/index.svelte.js";

const modules = getModules();
const chatService = getChatService();
const toolService = getToolService();

const ChatConversationArea = modules.getOne<Component>("ChatConversationArea");
const ChatInputPanel = modules.getOne<Component>("ChatInputPanel");

let availableModels = $state<ProviderModel[]>([]);
let modelsLoading = $state(false);
let selectedModel = $state("");

async function loadModels() {
    modelsLoading = true;
    try {
        const models = await llmProviderService.fetchModels();
        availableModels = models;
        if (
            models.length > 0 &&
            !models.find((m) => m.selectId === selectedModel)
        ) {
            selectedModel = models[0].selectId;
        }
    } finally {
        modelsLoading = false;
    }
}

$effect(() => {
    // Re-run when providers list changes
    llmProviderService.providers.length;
    loadModels();
});

const selectedModelData = $derived(
    availableModels.find((m) => m.selectId === selectedModel),
);

const providerGroups = $derived(
    [...new Set(availableModels.map((m) => m.providerName))].map((name) => ({
        name,
        models: availableModels.filter((m) => m.providerName === name),
    })),
);

let messages = $state<UIMessage[]>([]);
let chatStatus = $state<"ready" | "submitted" | "streaming">("ready");

const isIdle = $derived(
    chatStatus !== "streaming" && chatStatus !== "submitted",
);
const canChat = $derived(Boolean(selectedModelData) && isIdle);

async function handleSend(text: string) {
    if (!selectedModelData) {
        return;
    }

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
    chatStatus = "submitted";

    try {
        chatStatus = "streaming";
        for await (const textPart of chatService.streamChat(
            selectedModelData,
            conversationForModel,
            toolService.selectedTools,
        )) {
            messages = messages.map((message) => {
                if (
                    message.id !== assistantMessageId ||
                    message.role !== "assistant"
                ) {
                    return message;
                }
                const previousText =
                    message.parts.find((part) => part.type === "text")?.text ??
                    "";
                return {
                    ...message,
                    parts: [
                        { type: "text", text: `${previousText}${textPart}` },
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
        chatStatus = "ready";
    }
}

function makeMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
</script>

<div class="relative flex size-full flex-col divide-y overflow-hidden">
	{#if ChatConversationArea}
		<ChatConversationArea
			{messages}
			status={chatStatus}
			{modelsLoading}
			hasModels={availableModels.length > 0}
			selectedModelName={selectedModelData?.modelName}
		/>
	{/if}
	{#if ChatInputPanel}
		<ChatInputPanel
			messageCount={messages.length}
			hasModels={availableModels.length > 0}
			{canChat}
			{isIdle}
			{providerGroups}
			bind:selectedModel
			{selectedModelData}
			onsend={handleSend}
		/>
	{/if}
</div>
