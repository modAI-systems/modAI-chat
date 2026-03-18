<script lang="ts">
import { Loader2, PlusIcon, Settings2, Trash2 } from "lucide-svelte";
import {
	llmProviderService,
	type Provider,
} from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import { Input } from "$lib/components/ui/input/index.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let newProviderName = $state("");
let newProviderBaseUrl = $state("");
let newProviderApiKey = $state("");
let addProviderError = $state("");
let addingProvider = $state(false);
let editingId = $state<string | null>(null);
let editName = $state("");
let editBaseUrl = $state("");
let editApiKey = $state("");

const providers = $derived(llmProviderService.providers);

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleAddProvider(e: SubmitEvent) {
	e.preventDefault();
	addProviderError = "";
	addingProvider = true;
	try {
		llmProviderService.createProvider({
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

function startEdit(provider: Provider) {
	editingId = provider.id;
	editName = provider.name;
	editBaseUrl = provider.base_url;
	editApiKey = provider.api_key;
}

function cancelEdit() {
	editingId = null;
}

function saveEdit(id: string) {
	try {
		llmProviderService.updateProvider(id, {
			name: editName,
			base_url: editBaseUrl,
			api_key: editApiKey,
		});
		editingId = null;
	} catch (err) {
		// stay in edit mode on error
		console.error(err);
	}
}

function deleteProvider(id: string) {
	llmProviderService.deleteProvider(id);
	if (editingId === id) editingId = null;
}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight">LLM Providers</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			Manage your OpenAI-compatible LLM providers.
		</p>
	</div>

	<!-- Existing providers -->
	{#if providers.length > 0}
		<div class="flex flex-col gap-3">
			{#each providers as provider (provider.id)}
				<Card.Root>
					<Card.Content class="flex flex-col gap-3 p-4">
						{#if editingId === provider.id}
							<div class="flex flex-col gap-2">
								<Input bind:value={editName} placeholder="Provider Name" />
								<Input bind:value={editBaseUrl} placeholder="Base URL" />
								<Input
									type="password"
									bind:value={editApiKey}
									placeholder="API Key"
								/>
								<div class="flex gap-2">
									<Button size="sm" onclick={() => saveEdit(provider.id)}>
										Save
									</Button>
									<Button size="sm" variant="outline" onclick={cancelEdit}>
										Cancel
									</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium">{provider.name}</p>
									<p class="text-muted-foreground text-xs">
										{provider.base_url}
									</p>
								</div>
								<div class="flex gap-1">
									<Button
										variant="ghost"
										size="sm"
										class="size-8 p-0"
										onclick={() => startEdit(provider)}
									>
										<Settings2 class="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive hover:text-destructive size-8 p-0"
										onclick={() => deleteProvider(provider.id)}
									>
										<Trash2 class="size-4" />
									</Button>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<!-- Add provider form -->
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
						API Key
					</label>
					<Input
						id="provider-key"
						type="password"
						bind:value={newProviderApiKey}
						placeholder="sk-..."
						required
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
</div>
