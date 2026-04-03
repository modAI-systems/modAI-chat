<script lang="ts">
import { RefreshCw } from "lucide-svelte";
import { getModuleDeps } from "@/core/module-system/index.js";
import type {
  OpenAIFunctionTool,
  ToolsService,
} from "@/modules/tools-service/index.svelte.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import * as Switch from "$lib/components/ui/switch/index.js";

const deps = getModuleDeps(
  "@/modules/tools-management/ToolsManagementComponent",
);
const toolsService = deps.getOne<ToolsService>("toolsService");

let availableTools = $state<OpenAIFunctionTool[]>([]);
let selectedToolNames = $state<string[]>([]);
let loading = $state(false);

$effect(() => {
  void refreshTools();
});

async function refreshTools() {
  loading = true;
  try {
    const [tools, selected] = await Promise.all([
      toolsService.fetchAvailableTools(),
      toolsService.fetchSelectedToolNames(),
    ]);
    availableTools = tools;
    selectedToolNames = selected.filter((name) =>
      tools.some((tool) => tool.function.name === name),
    );
    await toolsService.saveSelectedToolNames(selectedToolNames);
  } finally {
    loading = false;
  }
}

function isSelected(name: string): boolean {
  return selectedToolNames.includes(name);
}

async function handleToggle(name: string) {
  selectedToolNames = isSelected(name)
    ? selectedToolNames.filter((n) => n !== name)
    : [...selectedToolNames, name];

  await toolsService.saveSelectedToolNames(selectedToolNames);
}
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Tools</h2>
			<p class="text-muted-foreground mt-1 text-sm">
				Select which backend tools can be used in chat responses.
			</p>
		</div>
		<Button variant="outline" size="sm" class="gap-1.5" onclick={refreshTools} disabled={loading}>
			<RefreshCw class="size-3.5" />
			Refresh
		</Button>
	</div>

	{#if availableTools.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>No tools available</Card.Title>
				<Card.Description>
					No tools were returned by the modAI backend.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<div class="grid gap-3">
			{#each availableTools as tool}
				{@const selected = isSelected(tool.function.name)}
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-3">
							<div class="space-y-1">
								<Card.Title class="text-base">{tool.function.name}</Card.Title>
								<Card.Description>
									{tool.function.description ?? "No description available."}
								</Card.Description>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-muted-foreground text-xs">
									{selected ? "Enabled" : "Disabled"}
								</span>
								<Switch.Root
									checked={selected}
									onCheckedChange={() => handleToggle(tool.function.name)}
									aria-label={`Toggle tool ${tool.function.name}`}
									class="border-border data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&_[data-slot=switch-thumb]]:translate-x-0 [&_[data-slot=switch-thumb]]:bg-background data-[state=checked]:[&_[data-slot=switch-thumb]]:translate-x-[calc(100%-2px)]"
								/>
							</div>
						</div>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
