<script lang="ts">
import BotIcon from "@lucide/svelte/icons/bot";
import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
import UserIcon from "@lucide/svelte/icons/user";
import type { UIMessage } from "ai";
import { marked } from "marked";
import * as Avatar from "$lib/components/ui/avatar/index.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Collapsible from "$lib/components/ui/collapsible/index.js";

let {
    message,
    selectedModelName,
}: {
    message: UIMessage;
    selectedModelName: string | undefined;
} = $props();

function renderMarkdown(text: string): string {
    return marked.parse(text, { async: false }) as string;
}
</script>

<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
	<div
		class="flex max-w-[85%] gap-3 {message.role === 'user'
			? 'flex-row-reverse'
			: ''}"
	>
		<!-- Avatar -->
		<Avatar.Root class="border-border size-8 shrink-0 border">
			<Avatar.Fallback
				class="{message.role === 'user'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted'} text-xs"
			>
				{#if message.role === "assistant"}
					<BotIcon class="size-4" />
				{:else}
					<UserIcon class="size-4" />
				{/if}
			</Avatar.Fallback>
		</Avatar.Root>

		<!-- Message content -->
		<div class="min-w-0 flex-1">
			<p
				class="text-muted-foreground mb-1 text-xs font-medium {message.role ===
				'user'
					? 'text-right'
					: ''}"
			>
				{message.role === "user"
					? "You"
					: (selectedModelName ?? "Assistant")}
			</p>
			<div
				class="flex flex-col gap-2 {message.role === 'user'
					? 'items-end'
					: ''}"
			>
				{#each message.parts as part}
					{#if part.type === "text" && part.text}
						<div
							class="rounded-2xl px-4 py-2 {message.role === 'user'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted'}"
						>
							<div
								class="prose prose-sm dark:prose-invert max-w-none {message.role ===
								'user'
									? 'prose-invert'
									: ''}"
							>
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
										<ChevronDownIcon class="size-3" />
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
								{part.source.title ?? part.source.url}
							</a>
						</Badge>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>
