<script lang="ts">
import { Chat } from "@ai-sdk/svelte";
import {
	llmProviderService,
	type ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import ChatConversationArea from "./ChatConversationArea.svelte";
import ChatInputPanel from "./ChatInputPanel.svelte";

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

const chat = new Chat({
	api: "/api/chat",
	body: {
		get modelId() {
			return selectedModelData?.modelId ?? "gpt-4o";
		},
		get baseURL() {
			return selectedModelData?.providerBaseUrl ?? "";
		},
		get apiKey() {
			return selectedModelData?.providerApiKey ?? "";
		},
	},
});

const isIdle = $derived(
	chat.status !== "streaming" && chat.status !== "submitted",
);
const canChat = $derived(Boolean(selectedModelData) && isIdle);

function handleSend(text: string) {
	if (!selectedModelData) {
		return;
	}

	chat.sendMessage(
		{ text },
		{
			body: {
				modelId: selectedModelData.modelId,
				baseURL: selectedModelData.providerBaseUrl,
				apiKey: selectedModelData.providerApiKey,
			},
		},
	);
}
</script>

<div class="relative flex size-full flex-col divide-y overflow-hidden">
	<ChatConversationArea
		messages={chat.messages}
		status={chat.status}
		{modelsLoading}
		hasModels={availableModels.length > 0}
		selectedModelName={selectedModelData?.modelName}
	/>
	<ChatInputPanel
		messageCount={chat.messages.length}
		hasModels={availableModels.length > 0}
		{canChat}
		{isIdle}
		{providerGroups}
		bind:selectedModel
		{selectedModelData}
		onsend={handleSend}
	/>
</div>
