<script lang="ts">
import type { UIMessage } from "ai";
import { getModuleDeps } from "@/core/module-system/index.js";
import type { ChatService } from "@/modules/chat-service/index.svelte.js";
import type {
  LLMProviderService,
  ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import type {
  OpenAIFunctionTool,
  ToolsService,
} from "@/modules/tools-service/index.svelte.js";
import ChatConversationArea from "./ChatConversationArea.svelte";
import ChatInputPanel from "./ChatInputPanel.svelte";
import ChatModelSelector from "./ChatModelSelector.svelte";
import ChatSuggestions from "./ChatSuggestions.svelte";
import ChatToolsSelector from "./ChatToolsSelector.svelte";
import { modelSelectId } from "./utils.js";

const deps = getModuleDeps("@/modules/chat/ChatComponent");
const chatService = deps.getOne<ChatService>("chatService");
const llmProviderService =
  deps.getOne<LLMProviderService>("llmProviderService");
const toolsService = deps.getOne<ToolsService>("toolsService");

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
    const selectedTools = availableTools.filter((tool) =>
      selectedToolNames.includes(tool.function.name),
    );
    for await (const textPart of chatService.streamChat(
      selectedModelData,
      conversationForModel,
      selectedTools,
    )) {
      messages = messages.map((message) => {
        if (message.id !== assistantMessageId || message.role !== "assistant") {
          return message;
        }
        const previousText =
          message.parts.find((part) => part.type === "text")?.text ?? "";
        return {
          ...message,
          parts: [{ type: "text", text: `${previousText}${textPart}` }],
        };
      });
    }
  } catch {
    messages = messages.map((message) => {
      if (message.id !== assistantMessageId || message.role !== "assistant") {
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
	<ChatConversationArea
		{messages}
		status={chatStatus}
		{modelsLoading}
		hasModels={availableModels.length > 0}
		selectedModelName={selectedModelData?.modelName}
	/>
	{#if messages.length === 0 && availableModels.length > 0}
		<ChatSuggestions onselect={handleSend} />
	{/if}
	<ChatInputPanel
		{canChat}
		{isIdle}
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
	</ChatInputPanel>
</div>
