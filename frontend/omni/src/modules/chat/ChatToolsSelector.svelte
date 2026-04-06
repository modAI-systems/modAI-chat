<script lang="ts">
import { Check, Wrench } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import type { OpenAIFunctionTool } from "@/modules/tools-service/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Popover from "$lib/shadcnui/components/ui/popover/index.js";

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

function isSelected(name: string): boolean {
    return selectedToolNames.includes(name);
}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground h-auto gap-1.5 px-2 py-1 text-xs"
				aria-label={t("selectTools", { defaultValue: "Select tools" })}
				{...props}
			>
				<Wrench class="size-3.5" />
				{#if selectedToolNames.length > 0}
					<span>{selectedToolNames.length}</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[280px] p-1" align="start" side="top">
		<div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t("tools", { defaultValue: "Tools" })}</div>
		{#each availableTools as tool}
			<button
				type="button"
				class="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
				aria-label={t("toggleTool", { defaultValue: "Toggle tool {{name}}", name: tool.function.name })}
				aria-pressed={isSelected(tool.function.name)}
				onclick={() => ontoggle(tool.function.name)}
			>
				<Check
					class="mt-0.5 size-4 shrink-0 {isSelected(tool.function.name)
						? 'opacity-100'
						: 'opacity-0'}"
				/>
				<div>
					<div class="text-sm font-medium">{tool.function.name}</div>
					{#if tool.function.description}
						<div class="text-muted-foreground text-xs">{tool.function.description}</div>
					{/if}
				</div>
			</button>
		{/each}
	</Popover.Content>
</Popover.Root>
