<script lang="ts">
import type { UIMessage } from "ai";
import { ChevronDown } from "lucide-svelte";
import type { MarkdownRenderer } from "@/modules/markdown-renderer/index.svelte.js";
import { Badge } from "$lib/shadcnui/components/ui/badge/index.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Collapsible from "$lib/shadcnui/components/ui/collapsible/index.js";

let {
    message,
    renderers,
}: {
    message: UIMessage<{ modelName?: string }>;
    renderers: MarkdownRenderer[];
} = $props();

function render(text: string): string {
    return renderers.reduce((acc, renderer) => renderer.render(acc), text);
}
</script>

{#if message.role === "user"}
	<!-- User message: right-aligned secondary pill -->
	<div class="flex justify-end">
		<div class="bg-secondary text-secondary-foreground max-w-[85%] rounded-3xl px-4 py-3">
			{#each message.parts as part}
				{#if part.type === "text" && part.text}
				    <div class="prose prose-sm max-w-none">
						{@html render(part.text)}
					</div>
				{/if}
			{/each}
		</div>
	</div>
{:else}
	<!-- Assistant message: full-width, no bubble, prose directly -->
	<div class="flex flex-col gap-1">
		<p class="text-muted-foreground text-xs font-medium">
			{message.metadata?.modelName ?? "Assistant"}
		</p>
		<div class="flex flex-col gap-2">
			{#each message.parts as part}
				{#if part.type === "text" && part.text}
					<div class="prose prose-sm prose-assistant max-w-none">
						{@html render(part.text)}
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
							{part.source.title ?? part.source.url}
						</a>
					</Badge>
				{/if}
			{/each}
		</div>
	</div>
{/if}
