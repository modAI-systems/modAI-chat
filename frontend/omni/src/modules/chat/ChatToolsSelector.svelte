<script lang="ts">
import { Check, Wrench } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import type { OpenAIFunctionTool } from "@/modules/tools-service/index.svelte.js";
import { sortToolsByName } from "@/modules/tools-service/toolName";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Popover from "$lib/shadcnui/components/ui/popover/index.js";
import * as Tooltip from "$lib/shadcnui/components/ui/tooltip/index.js";

const t = getT("chat");

let {
    availableTools,
    selectedToolNames,
    ontoggle,
}: {
    availableTools: OpenAIFunctionTool[];
    selectedToolNames: string[];
    ontoggle: (toolName: string) => void;
} = $props();

let open = $state(false);
const sortedTools = $derived(sortToolsByName(availableTools));

function isSelected(name: string): boolean {
    return selectedToolNames.includes(name);
}

function formatToolName(name: string): string {
    return name
        .replace(/[_-]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase());
}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground h-auto gap-1.5 px-2 py-1 text-xs"
				aria-label={t("selectTools", { defaultValue: "Select tools" }) as string}
				{...props}
			>
				<Wrench class="size-3.5" />
				{#if selectedToolNames.length > 0}
					<span>{selectedToolNames.length}</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="max-h-[70vh] w-[280px] overflow-y-auto p-1" align="start" side="top">
		<div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t("tools", { defaultValue: "Tools" })}</div>
		{#each sortedTools as tool}
			{@const displayName = formatToolName(tool.name)}
			{#if tool.description}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
								aria-label={t("toggleTool", { defaultValue: "Toggle tool {{name}}", name: displayName }) as string}
								aria-pressed={isSelected(tool.name)}
								{...props}
								onclick={() => ontoggle(tool.name)}
							>
								<Check class="size-4 shrink-0 {isSelected(tool.name) ? 'opacity-100' : 'opacity-0'}" />
								<div class="text-sm font-medium">{displayName}</div>
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right" align="start">
						{tool.description}
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
					aria-label={t("toggleTool", { defaultValue: "Toggle tool {{name}}", name: displayName }) as string}
					aria-pressed={isSelected(tool.name)}
					onclick={() => ontoggle(tool.name)}
				>
					<Check class="size-4 shrink-0 {isSelected(tool.name) ? 'opacity-100' : 'opacity-0'}" />
					<div class="text-sm font-medium">{displayName}</div>
				</button>
			{/if}
		{/each}
	</Popover.Content>
</Popover.Root>
