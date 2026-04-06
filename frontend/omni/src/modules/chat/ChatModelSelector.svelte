<script lang="ts">
import { Check, ChevronDown } from "lucide-svelte";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Command from "$lib/components/ui/command/index.js";
import * as Popover from "$lib/components/ui/popover/index.js";
import { modelSelectId } from "./utils.js";

let {
    providerGroups,
    selectedModel = $bindable(),
    selectedModelData,
}: {
    providerGroups: { name: string; models: ProviderModel[] }[];
    selectedModel: string;
    selectedModelData: ProviderModel | undefined;
} = $props();

let open = $state(false);

function handleSelect(selectId: string) {
    selectedModel = selectId;
    open = false;
}
</script>

<Popover.Root bind:open>
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
								onSelect={() => handleSelect(modelSelectId(m))}
								value={modelSelectId(m)}
							>
								<span class="flex-1">{m.modelName}</span>
								{#if selectedModel === modelSelectId(m)}
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
