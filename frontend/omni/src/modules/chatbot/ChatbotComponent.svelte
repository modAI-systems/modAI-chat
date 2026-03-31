<script lang="ts">
import type { UIMessage } from "ai";
import { getChatService } from "@/modules/chat-service/index.svelte.js";
import {
  getLLMProviderService,
  type ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import ChatConversationArea from "./ChatConversationArea.svelte";
import ChatInputPanel from "./ChatInputPanel.svelte";
import { modelSelectId } from "./utils.js";

const chatService = getChatService();
const llmProviderService = getLLMProviderService();

let availableModels = $state<ProviderModel[]>([]);
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
    for await (const textPart of chatService.streamChat(
      selectedModelData,
      conversationForModel,
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
</div>
