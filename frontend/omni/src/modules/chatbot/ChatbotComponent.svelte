<script lang="ts">
import { Chat } from "@ai-sdk/svelte";
import * as Avatar from "$lib/components/ui/avatar/index.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
import { Separator } from "$lib/components/ui/separator/index.js";
import { Textarea } from "$lib/components/ui/textarea/index.js";

const chat = new Chat({
	api: "/api/chat",
});

let input = $state("");
let scrollContainer = $state<HTMLElement | null>(null);

function scrollToBottom() {
	if (scrollContainer) {
		scrollContainer.scrollTop = scrollContainer.scrollHeight;
	}
}

$effect(() => {
	// Re-run whenever messages change
	chat.messages;
	scrollToBottom();
});

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

const suggestions = [
	"What are the latest trends in AI?",
	"How does machine learning work?",
	"Explain quantum computing",
	"Best practices for Svelte development",
];

function handleSuggestion(suggestion: string) {
	chat.sendMessage({ text: suggestion });
}
</script>

<div class="flex h-full flex-col">
	<!-- Messages area -->
	<ScrollArea class="flex-1 p-4" bind:ref={scrollContainer}>
		<div class="mx-auto flex max-w-3xl flex-col gap-4">
			{#if chat.messages.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12">
					<div class="text-center">
						<h2 class="text-2xl font-semibold tracking-tight">
							How can I help you today?
						</h2>
						<p class="text-muted-foreground mt-2 text-sm">
							Ask me anything or pick a suggestion below.
						</p>
					</div>
					<div class="flex flex-wrap justify-center gap-2">
						{#each suggestions as suggestion}
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleSuggestion(suggestion)}
							>
								{suggestion}
							</Button>
						{/each}
					</div>
				</div>
			{/if}

			{#each chat.messages as message (message.id)}
				<div
					class={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
				>
					<Avatar.Root class="size-8 shrink-0">
						<Avatar.Fallback>
							{message.role === "user" ? "U" : "AI"}
						</Avatar.Fallback>
					</Avatar.Root>

					<div
						class={`max-w-[80%] ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
					>
						<Card.Root
							class={message.role === 'user'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted'}
						>
							<Card.Content class="p-3">
								{#each message.parts as part}
									{#if part.type === "text"}
										<div class="whitespace-pre-wrap text-sm">
											{part.text}
										</div>
									{:else if part.type === "reasoning"}
										<details class="mt-2">
											<summary
												class="text-muted-foreground cursor-pointer text-xs"
											>
												Reasoning
											</summary>
											<div
												class="text-muted-foreground mt-1 text-xs"
											>
												{part.reasoning}
											</div>
										</details>
									{:else if part.type === "source"}
										<Badge variant="secondary" class="mt-1">
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
							</Card.Content>
						</Card.Root>
					</div>
				</div>
			{/each}

			{#if chat.status === "streaming" || chat.status === "submitted"}
				<div class="flex gap-3">
					<Avatar.Root class="size-8 shrink-0">
						<Avatar.Fallback>AI</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex items-center gap-1 p-3">
						<span
							class="bg-foreground/60 size-2 animate-bounce rounded-full [animation-delay:-0.3s]"
						></span>
						<span
							class="bg-foreground/60 size-2 animate-bounce rounded-full [animation-delay:-0.15s]"
						></span>
						<span
							class="bg-foreground/60 size-2 animate-bounce rounded-full"
						></span>
					</div>
				</div>
			{/if}
		</div>
	</ScrollArea>

	<Separator />

	<!-- Input area -->
	<div class="mx-auto w-full max-w-3xl p-4">
		<form onsubmit={handleSubmit} class="flex gap-2">
			<Textarea
				bind:value={input}
				onkeydown={handleKeydown}
				placeholder="Type a message..."
				class="min-h-[44px] flex-1 resize-none"
				rows={1}
			/>
			<Button
				type="submit"
				disabled={!input.trim() ||
					chat.status === "streaming" ||
					chat.status === "submitted"}
			>
				Send
			</Button>
		</form>
	</div>
</div>
