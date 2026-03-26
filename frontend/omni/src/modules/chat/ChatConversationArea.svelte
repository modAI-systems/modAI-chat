<script lang="ts">
import BotIcon from "@lucide/svelte/icons/bot";
import Loader2Icon from "@lucide/svelte/icons/loader-circle";
import type { UIMessage } from "ai";
import * as Avatar from "$lib/components/ui/avatar/index.ts";
import { ScrollArea } from "$lib/components/ui/scroll-area/index.ts";
import ChatMessageItem from "./ChatMessageItem.svelte";

let {
    messages,
    status,
    modelsLoading,
    hasModels,
    selectedModelName,
}: {
    messages: UIMessage[];
    status: string;
    modelsLoading: boolean;
    hasModels: boolean;
    selectedModelName: string | undefined;
} = $props();

let conversationEl = $state<HTMLElement | null>(null);

function scrollToBottom() {
    if (conversationEl) {
        conversationEl.scrollTop = conversationEl.scrollHeight;
    }
}

$effect(() => {
    // Access messages to track reactive changes (including streaming updates)
    messages;
    scrollToBottom();
});
</script>

<ScrollArea class="flex-1" bind:ref={conversationEl}>
	<div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
		{#if messages.length === 0}
			{#if modelsLoading}
				<div class="flex items-center justify-center gap-2 py-20">
					<Loader2Icon class="text-muted-foreground size-6 animate-spin" />
					<span class="text-muted-foreground text-sm">Loading models...</span>
				</div>
			{:else}
				<!-- Normal empty state -->
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
							{#if !hasModels}
								Add a provider in Settings to start chatting.
							{:else}
								Ask me anything or pick a suggestion below.
							{/if}
						</p>
					</div>
				</div>
			{/if}
		{/if}

		{#each messages as message (message.id)}
			<ChatMessageItem {message} {selectedModelName} />
		{/each}

		<!-- Streaming indicator -->
		{#if status === "streaming" || status === "submitted"}
			<div class="flex gap-3">
				<Avatar.Root class="border-border size-8 shrink-0 border">
					<Avatar.Fallback class="bg-primary/10 text-primary text-xs">
						<BotIcon class="size-4" />
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="flex items-center gap-2 pt-1">
					<Loader2Icon class="text-muted-foreground size-4 animate-spin" />
					<span class="text-muted-foreground text-xs">
						{status === "submitted" ? "Thinking..." : "Generating..."}
					</span>
				</div>
			</div>
		{/if}
	</div>
</ScrollArea>
