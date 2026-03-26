<script lang="ts">
import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
import WrenchIcon from "@lucide/svelte/icons/wrench";
import { getToolService } from "@/modules/tools-management-service/index.svelte.ts";

const toolService = getToolService();

import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import { Checkbox } from "$lib/components/ui/checkbox/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import { Skeleton } from "$lib/components/ui/skeleton/index.js";

$effect(() => {
    toolService.fetchTools();
});

const selectedCount = $derived(toolService.selectedToolNames.size);
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<WrenchIcon class="text-muted-foreground size-5" />
			<div>
				<h2 class="text-lg font-semibold tracking-tight">Tools</h2>
				<p class="text-muted-foreground text-sm">
					Select tools to make available during chat conversations.
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if selectedCount > 0}
				<Badge variant="secondary">{selectedCount} selected</Badge>
			{/if}
			<Button
				variant="outline"
				size="sm"
				onclick={() => toolService.fetchTools()}
				disabled={toolService.loading}
			>
				<RefreshCwIcon class="mr-1.5 size-3.5 {toolService.loading ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if toolService.loading && toolService.tools.length === 0}
		<div class="flex flex-col gap-3">
			{#each Array(3) as _}
				<Skeleton class="h-20 w-full rounded-lg" />
			{/each}
		</div>
	{:else if toolService.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-destructive">Failed to load tools</Card.Title>
				<Card.Description>{toolService.error}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" size="sm" onclick={() => toolService.fetchTools()}>
					Retry
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else if toolService.tools.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>No tools available</Card.Title>
				<Card.Description>
					No tools are currently registered in the backend. Configure tools in your backend config.yaml to get started.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<div class="flex flex-col gap-3">
			{#each toolService.tools as t (t.name)}
				{@const isSelected = toolService.selectedToolNames.has(t.name)}
				<Label
					class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors {isSelected ? 'border-primary bg-primary/5' : ''}"
				>
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => toolService.toggleTool(t.name)}
						class="mt-0.5"
					/>
					<div class="grid min-w-0 gap-1">
						<p class="text-sm leading-none font-medium">{t.name}</p>
						{#if t.description}
							<p class="text-muted-foreground text-sm">{t.description}</p>
						{/if}
					</div>
				</Label>
			{/each}
		</div>
	{/if}
</div>
