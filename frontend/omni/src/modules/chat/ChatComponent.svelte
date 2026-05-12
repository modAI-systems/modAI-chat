<script lang="ts">
import { getModuleDeps } from "@/core/module-system/index.js";
import type { AudioService } from "@/modules/audio-service/index.svelte.js";
import {
    getRealtimeModel,
    getTranscriptModel,
} from "@/modules/audio-settings/audioSettings.svelte.js";
import type { ChatService } from "@/modules/chat-service/index.svelte.js";
import type {
    LLMProviderService,
    ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import type { MarkdownRenderer } from "@/modules/markdown-renderer/index.svelte.js";
import type {
    OpenAIFunctionTool,
    ToolsService,
} from "@/modules/tools-service/index.svelte.js";
import ChatConversationArea from "./ChatConversationArea.svelte";
import ChatInputPanel from "./ChatInputPanel.svelte";
import ChatModelSelector from "./ChatModelSelector.svelte";
import ChatRealtimeButton from "./ChatRealtimeButton.svelte";
import ChatSuggestions from "./ChatSuggestions.svelte";
import ChatToolsSelector from "./ChatToolsSelector.svelte";
import { createChatMessages } from "./chatMessages.svelte.js";
import { modelSelectId } from "./utils.js";

const deps = getModuleDeps("@/modules/chat/ChatComponent");
const chatService = deps.getOne<ChatService>("chatService");
const audioService = deps.getOne<AudioService>("audioService");
const llmProviderService =
    deps.getOne<LLMProviderService>("llmProviderService");
const toolsService = deps.getOne<ToolsService>("toolsService");
const markdownRenderers = deps.getAll<MarkdownRenderer>("markdownRenderers");

let availableModels = $state<ProviderModel[]>([]);
let availableTools = $state<OpenAIFunctionTool[]>([]);
let selectedToolNames = $state<string[]>([]);
let modelsLoading = $state(false);
let selectedModel = $state("");

async function loadModels() {
    modelsLoading = true;
    try {
        const providers = await llmProviderService.fetchProviders();
        const results = await Promise.allSettled(
            providers.map((p) => llmProviderService.fetchModels(p)),
        );
        const models = results.flatMap((r) =>
            r.status === "fulfilled" ? r.value : [],
        );
        availableModels = models;
        if (
            models.length > 0 &&
            !models.find((m) => modelSelectId(m) === selectedModel)
        ) {
            selectedModel = modelSelectId(models[0]);
        }
    } finally {
        modelsLoading = false;
    }
}

$effect(() => {
    loadModels();
});
$effect(() => {
    void loadTools();
});

async function loadTools() {
    availableTools = await toolsService.fetchAvailableTools();
}

function handleToolToggle(toolName: string) {
    selectedToolNames = selectedToolNames.includes(toolName)
        ? selectedToolNames.filter((n) => n !== toolName)
        : [...selectedToolNames, toolName];
}

const selectedModelData = $derived(
    availableModels.find((m) => modelSelectId(m) === selectedModel),
);

function resolveFromAvailable(
    stored: ProviderModel | null,
    models: ProviderModel[],
): ProviderModel | null {
    if (!stored) return null;
    return (
        models.find(
            (m) =>
                m.providerName === stored.providerName &&
                m.modelName === stored.modelName,
        ) ?? stored
    );
}

const resolvedRealtimeModel = $derived(
    resolveFromAvailable(getRealtimeModel(), availableModels),
);
const resolvedTranscriptModel = $derived(
    resolveFromAvailable(getTranscriptModel(), availableModels),
);

const providerGroups = $derived(
    [...new Set(availableModels.map((m) => m.providerName))].map((name) => ({
        name,
        models: availableModels.filter((m) => m.providerName === name),
    })),
);

const chat = createChatMessages(chatService);
const canChat = $derived(Boolean(selectedModelData) && chat.isIdle);

function handleSend(text: string) {
    const selectedTools = availableTools.filter((t) =>
        selectedToolNames.includes(t.name),
    );
    void chat.handleSend(text, selectedModelData, selectedTools);
}
</script>

<div class="relative flex size-full flex-col divide-y overflow-hidden">
	<ChatConversationArea
		messages={chat.messages}
		status={chat.chatStatus}
		{modelsLoading}
		hasModels={availableModels.length > 0}
		renderers={markdownRenderers}
	/>
	{#if chat.messages.length === 0 && availableModels.length > 0}
		<ChatSuggestions onselect={handleSend} />
	{/if}
	<ChatInputPanel
		{canChat}
		isIdle={chat.isIdle}
		onsend={handleSend}
	>
		{#if availableTools.length > 0}
			<ChatToolsSelector
				{availableTools}
				{selectedToolNames}
				ontoggle={handleToolToggle}
			/>
		{/if}

		<ChatModelSelector
			{providerGroups}
			bind:selectedModel
			{selectedModelData}
		/>

		{#snippet rightActions()}
			{#if resolvedRealtimeModel}
				<ChatRealtimeButton
					{audioService}
					model={resolvedRealtimeModel}
					transcriptModel={resolvedTranscriptModel}
					disabled={!canChat}
					onmessage={chat.realtimeCallbacks}
				/>
			{/if}
		{/snippet}
	</ChatInputPanel>
</div>
