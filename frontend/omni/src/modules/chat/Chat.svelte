<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";
import { getConversationService } from "@/modules/conversation-service/index.svelte.ts";
import {
    llmProviderService,
    type ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.ts";
import { getToolService } from "@/modules/tools-management-service/index.svelte.ts";

const modules = getModules();
const conversationService = getConversationService();
const toolService = getToolService();
const conversation = conversationService.createConversation();

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

const isIdle = $derived(
    conversation.status !== "streaming" && conversation.status !== "submitted",
);
const canChat = $derived(Boolean(selectedModelData) && isIdle);

async function handleSend(text: string) {
    if (!selectedModelData) {
        return;
    }
    await conversation.send(text, selectedModelData, toolService.selectedTools);
}
</script>

<div class="relative flex size-full flex-col divide-y overflow-hidden">
	{#if ChatConversationArea}
		<ChatConversationArea
			messages={conversation.messages}
			status={conversation.status}
			{modelsLoading}
			hasModels={availableModels.length > 0}
			selectedModelName={selectedModelData?.modelName}
		/>
	{/if}
	{#if ChatInputPanel}
		<ChatInputPanel
			messageCount={conversation.messages.length}
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
