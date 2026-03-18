<script lang="ts">
import { Chat } from "@ai-sdk/svelte";
import {
	BotIcon,
	Check,
	ChevronDown,
	Loader2,
	SendIcon,
	UserIcon,
} from "lucide-svelte";
import { marked } from "marked";
import * as Avatar from "$lib/components/ui/avatar/index.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Collapsible from "$lib/components/ui/collapsible/index.js";
import * as Command from "$lib/components/ui/command/index.js";
import * as Popover from "$lib/components/ui/popover/index.js";
import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
import { Separator } from "$lib/components/ui/separator/index.js";
import { Textarea } from "$lib/components/ui/textarea/index.js";

// ---------------------------------------------------------------------------
// Models data
// ---------------------------------------------------------------------------

interface Model {
	chef: string;
	chefSlug: string;
	id: string;
	name: string;
}

const models: Model[] = [
	{ chef: "OpenAI", chefSlug: "openai", id: "gpt-4o", name: "GPT-4o" },
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "gpt-4o-mini",
		name: "GPT-4o Mini",
	},
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "gpt-3.5-turbo",
		name: "GPT-3.5 Turbo",
	},
];

const chefs = [...new Set(models.map((m) => m.chef))];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let selectedModel = $state(models[0].id);
let modelSelectorOpen = $state(false);
let input = $state("");
let conversationEl = $state<HTMLElement | null>(null);

const selectedModelData = $derived(models.find((m) => m.id === selectedModel));

const chat = new Chat({
	api: "/api/chat",
	body: {
		get model() {
			return selectedModel;
		},
	},
});

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

// ---------------------------------------------------------------------------
// Scroll to bottom
// ---------------------------------------------------------------------------

function scrollToBottom() {
	if (conversationEl) {
		conversationEl.scrollTop = conversationEl.scrollHeight;
	}
}

$effect(() => {
	chat.messages;
	scrollToBottom();
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleSubmit(event: SubmitEvent) {
	event.preventDefault();
	if (!input.trim()) return;
	chat.sendMessage({ text: input });
	input = "";
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		if (!input.trim()) return;
		chat.sendMessage({ text: input });
		input = "";
	}
}

function handleSuggestion(suggestion: string) {
	chat.sendMessage({ text: suggestion });
}

function handleModelSelect(modelId: string) {
	selectedModel = modelId;
	modelSelectorOpen = false;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): string {
	return marked.parse(text, { async: false }) as string;
}

const isIdle = $derived(
	chat.status !== "streaming" && chat.status !== "submitted",
);
</script>

<div class="relative flex size-full flex-col divide-y overflow-hidden">
	<!-- ================================================================ -->
	<!-- Conversation area                                                 -->
	<!-- ================================================================ -->
	<ScrollArea class="flex-1" bind:ref={conversationEl}>
		<div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
			{#if chat.messages.length === 0}
				<!-- Empty state -->
				<div
					class="flex flex-col items-center justify-center gap-6 py-20"
				>
					<div
						class="bg-primary/10 flex size-16 items-center justify-center rounded-full"
					>
						<BotIcon class="text-primary size-8" />
					</div>
					<div class="text-center">
						<h2 class="text-2xl font-semibold tracking-tight">
							How can I help you today?
						</h2>
						<p class="text-muted-foreground mt-2 text-sm">
							Ask me anything or pick a suggestion below.
						</p>
					</div>
				</div>
			{/if}

			{#each chat.messages as message (message.id)}
				<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
					<div class="flex max-w-[85%] gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
						<!-- Avatar -->
						<Avatar.Root
							class="border-border size-8 shrink-0 border"
						>
							<Avatar.Fallback class="{message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} text-xs">
								{#if message.role === "assistant"}
									<BotIcon class="size-4" />
								{:else}
									<UserIcon class="size-4" />
								{/if}
							</Avatar.Fallback>
						</Avatar.Root>

						<!-- Message content -->
						<div class="min-w-0 flex-1">
							<p class="text-muted-foreground mb-1 text-xs font-medium {message.role === 'user' ? 'text-right' : ''}">
								{message.role === "user" ? "You" : selectedModelData?.name ?? "Assistant"}
							</p>
							<div class="flex flex-col gap-2 {message.role === 'user' ? 'items-end' : ''}">
								{#each message.parts as part}
									{#if part.type === "text" && part.text}
										<div class="rounded-2xl px-4 py-2 {message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}"
										>
											<div class="prose prose-sm dark:prose-invert max-w-none {message.role === 'user' ? 'prose-invert' : ''}">
												{@html renderMarkdown(part.text)}
											</div>
										</div>
								{:else if part.type === "reasoning"}
									<Collapsible.Root>
										<Collapsible.Trigger asChild>
											{#snippet child({ props })}
												<Button
													variant="ghost"
													size="sm"
													class="text-muted-foreground h-auto gap-1.5 px-2 py-1 text-xs"
													{...props}
												>
													<ChevronDown class="size-3" />
													Reasoning
												</Button>
											{/snippet}
										</Collapsible.Trigger>
										<Collapsible.Content>
											<div
												class="bg-muted text-muted-foreground mt-1 rounded-md p-3 text-xs whitespace-pre-wrap"
											>
												{part.reasoning}
											</div>
										</Collapsible.Content>
									</Collapsible.Root>
								{:else if part.type === "source"}
									<Badge variant="secondary" class="w-fit">
										<a
											href={part.source.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-xs"
										>
											{part.source.title ??
												part.source.url}
										</a>
									</Badge>
								{/if}
							{/each}
						</div>
					</div>
				</div>
				</div>
			{/each}

			<!-- Streaming indicator -->
			{#if chat.status === "streaming" || chat.status === "submitted"}
				<div class="flex gap-3">
					<Avatar.Root class="border-border size-8 shrink-0 border">
						<Avatar.Fallback
							class="bg-primary/10 text-primary text-xs"
						>
							<BotIcon class="size-4" />
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex items-center gap-2 pt-1">
						<Loader2
							class="text-muted-foreground size-4 animate-spin"
						/>
						<span class="text-muted-foreground text-xs">
							{chat.status === "submitted"
								? "Thinking..."
								: "Generating..."}
						</span>
					</div>
				</div>
			{/if}
		</div>
	</ScrollArea>

	<!-- ================================================================ -->
	<!-- Bottom panel: suggestions + input                                 -->
	<!-- ================================================================ -->
	<div class="shrink-0">
		<!-- Suggestions -->
		{#if chat.messages.length === 0}
			<div
				class="flex flex-wrap justify-center gap-2 border-b px-4 py-3"
			>
				{#each suggestions as suggestion}
					<Button
						variant="outline"
						size="sm"
						class="h-auto px-3 py-1.5 text-xs"
						onclick={() => handleSuggestion(suggestion)}
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
					disabled={!isIdle}
				/>
				<div class="flex items-center justify-between">
					<!-- Left: Model selector -->
					<Popover.Root
						bind:open={modelSelectorOpen}
					>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									size="sm"
									class="text-muted-foreground h-auto gap-1.5 px-2 py-1 text-xs"
									{...props}
								>
									{selectedModelData?.name ?? "Select model"}
									<ChevronDown class="size-3" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content
							class="w-[250px] p-0"
							align="start"
							side="top"
						>
							<Command.Root>
								<Command.Input placeholder="Search models..." />
								<Command.List>
									<Command.Empty
										>No models found.</Command.Empty
									>
									{#each chefs as chef}
										<Command.Group heading={chef}>
											{#each models.filter((m) => m.chef === chef) as m}
												<Command.Item
													onSelect={() =>
														handleModelSelect(m.id)}
													value={m.id}
												>
													<span class="flex-1"
														>{m.name}</span
													>
													{#if selectedModel === m.id}
														<Check
															class="size-4"
														/>
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
						disabled={!input.trim() || !isIdle}
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
</div>
