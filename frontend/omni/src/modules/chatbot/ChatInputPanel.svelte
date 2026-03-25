<script lang="ts">
import { Check, ChevronDown, Loader2, SendIcon } from "lucide-svelte";
import type { ProviderModel } from "@/modules/llm-provider-management/service/index.svelte.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Command from "$lib/components/ui/command/index.js";
import * as Popover from "$lib/components/ui/popover/index.js";
import { Textarea } from "$lib/components/ui/textarea/index.js";

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for Svelte development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
  "What is the difference between SQL and NoSQL?",
  "Explain cloud computing basics",
];

let {
  messageCount,
  hasModels,
  canChat,
  isIdle,
  providerGroups,
  selectedModel = $bindable(),
  selectedModelData,
  onsend,
}: {
  messageCount: number;
  hasModels: boolean;
  canChat: boolean;
  isIdle: boolean;
  providerGroups: { name: string; models: ProviderModel[] }[];
  selectedModel: string;
  selectedModelData: ProviderModel | undefined;
  onsend: (text: string) => void;
} = $props();

let input = $state("");
let modelSelectorOpen = $state(false);

function handleSubmit(event: SubmitEvent) {
  event.preventDefault();
  sendMessage();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function sendMessage() {
  if (!input.trim()) return;
  onsend(input);
  input = "";
}

function handleModelSelect(selectId: string) {
  selectedModel = selectId;
  modelSelectorOpen = false;
}
</script>

<div class="shrink-0">
	<!-- Suggestions -->
	{#if messageCount === 0 && hasModels}
		<div class="flex flex-wrap justify-center gap-2 border-b px-4 py-3">
			{#each suggestions as suggestion}
				<Button
					variant="outline"
					size="sm"
					class="h-auto px-3 py-1.5 text-xs"
					onclick={() => onsend(suggestion)}
				>
					{suggestion}
				</Button>
			{/each}
		</div>
	{/if}

	<!-- Input area -->
	<div class="mx-auto w-full max-w-3xl px-4 py-3">
		<form onsubmit={handleSubmit} class="flex flex-col gap-2">
			<Textarea
				bind:value={input}
				onkeydown={handleKeydown}
				placeholder="Type a message..."
				class="min-h-[44px] resize-none"
				rows={1}
				disabled={!canChat}
			/>
			<div class="flex items-center justify-between">
				<!-- Left: Model selector -->
				<Popover.Root bind:open={modelSelectorOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="ghost"
								size="sm"
								class="text-muted-foreground h-auto gap-1.5 px-2 py-1 text-xs"
								{...props}
							>
								{selectedModelData?.modelName ?? "Select model"}
								<ChevronDown class="size-3" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-[250px] p-0" align="start" side="top">
						<Command.Root>
							<Command.Input placeholder="Search models..." />
							<Command.List>
								<Command.Empty>No models found.</Command.Empty>
								{#each providerGroups as group}
									<Command.Group heading={group.name}>
										{#each group.models as m}
											<Command.Item
												onSelect={() => handleModelSelect(m.selectId)}
												value={m.selectId}
											>
												<span class="flex-1">{m.modelName}</span>
												{#if selectedModel === m.selectId}
													<Check class="size-4" />
												{/if}
											</Command.Item>
										{/each}
									</Command.Group>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>

				<!-- Right: Submit -->
				<Button
					type="submit"
					size="sm"
					disabled={!input.trim() || !canChat}
					class="gap-1.5"
				>
					{#if !isIdle}
						<Loader2 class="size-3.5 animate-spin" />
					{:else}
						<SendIcon class="size-3.5" />
					{/if}
					Send
				</Button>
			</div>
		</form>
	</div>
</div>
