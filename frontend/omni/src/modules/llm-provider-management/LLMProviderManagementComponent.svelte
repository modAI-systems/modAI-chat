<script lang="ts">
import AddProviderForm from "@/modules/llm-provider-management/AddProviderForm.svelte";
import ProviderList from "@/modules/llm-provider-management/ProviderList.svelte";
import {
	type CreateProviderRequest,
	llmProviderService,
} from "@/modules/llm-provider-service/index.svelte.js";

const providers = $derived(llmProviderService.providers);

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleAddProvider(data: CreateProviderRequest) {
	llmProviderService.createProvider(data);
}

function handleUpdateProvider(
	id: string,
	data: Partial<CreateProviderRequest>,
) {
	llmProviderService.updateProvider(id, data);
}

function handleDeleteProvider(id: string) {
	llmProviderService.deleteProvider(id);
}

async function handleCheckProviderHealth(providerId: string): Promise<number> {
	return llmProviderService.checkProviderHealth(providerId);
}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight">LLM Providers</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			Manage your OpenAI-compatible LLM providers.
		</p>
	</div>

	<ProviderList
		{providers}
		onUpdateProvider={handleUpdateProvider}
		onDeleteProvider={handleDeleteProvider}
		onCheckProviderHealth={handleCheckProviderHealth}
	/>

	<AddProviderForm onAddProvider={handleAddProvider} />
</div>
