<script lang="ts">
import { Loader2, PlusIcon } from "lucide-svelte";
import type { CreateProviderRequest } from "@/modules/llm-provider-service/index.svelte.ts";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import { Input } from "$lib/components/ui/input/index.js";

let { onAddProvider } = $props<{
    onAddProvider: (data: CreateProviderRequest) => void;
}>();

let newProviderName = $state("");
let newProviderBaseUrl = $state("");
let newProviderApiKey = $state("");
let addProviderError = $state("");
let addingProvider = $state(false);

function handleAddProvider(e: SubmitEvent) {
    e.preventDefault();
    addProviderError = "";
    addingProvider = true;
    try {
        onAddProvider({
            name: newProviderName,
            base_url: newProviderBaseUrl,
            api_key: newProviderApiKey,
        });
        newProviderName = "";
        newProviderBaseUrl = "";
        newProviderApiKey = "";
    } catch (err) {
        addProviderError =
            err instanceof Error ? err.message : "Failed to add provider";
    } finally {
        addingProvider = false;
    }
}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2 text-base">
			<PlusIcon class="size-4" />
			Add Provider
		</Card.Title>
	</Card.Header>
	<Card.Content>
		<form onsubmit={handleAddProvider} class="flex flex-col gap-3">
			<div class="flex flex-col gap-1.5">
				<label for="provider-name" class="text-sm font-medium">
					Provider Name
				</label>
				<Input
					id="provider-name"
					bind:value={newProviderName}
					placeholder="My Provider"
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="provider-url" class="text-sm font-medium">
					Base URL
				</label>
				<Input
					id="provider-url"
					bind:value={newProviderBaseUrl}
					placeholder="http://localhost:3001"
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="provider-key" class="text-sm font-medium">
					API Key (optional)
				</label>
				<Input
					id="provider-key"
					type="password"
					bind:value={newProviderApiKey}
					placeholder="sk-..."
				/>
			</div>
			{#if addProviderError}
				<p class="text-destructive text-sm">{addProviderError}</p>
			{/if}
			<Button type="submit" disabled={addingProvider}>
				{#if addingProvider}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{/if}
				Add Provider
			</Button>
		</form>
	</Card.Content>
</Card.Root>
