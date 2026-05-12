<script lang="ts">
import { PlusIcon } from "lucide-svelte";
import { getModuleDeps } from "@/core/module-system/index.js";
import { getT } from "@/modules/i18n/index.svelte.js";
import AddProviderForm from "@/modules/llm-provider-management/AddProviderForm.svelte";
import ProviderList from "@/modules/llm-provider-management/ProviderList.svelte";
import type {
    CreateProviderRequest,
    LLMProviderService,
    Provider,
} from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";

const deps = getModuleDeps(
    "@/modules/llm-provider-management/LLMProviderManagementComponent",
);
const llmProviderService =
    deps.getOne<LLMProviderService>("llmProviderService");
const t = getT("llm-provider-management");
let providers = $state<Provider[]>([]);
let showAddForm = $state(false);

$effect(() => {
    void refreshProviders();
});

async function refreshProviders() {
    providers = await llmProviderService.fetchProviders();
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleAddProvider(data: CreateProviderRequest) {
    await llmProviderService.createProvider(data);
    await refreshProviders();
}

async function handleUpdateProvider(
    id: string,
    data: Partial<CreateProviderRequest>,
) {
    await llmProviderService.updateProvider(id, data);
    await refreshProviders();
}

async function handleDeleteProvider(id: string) {
    await llmProviderService.deleteProvider(id);
    await refreshProviders();
}

async function handleCheckProviderHealth(provider: Provider): Promise<boolean> {
    try {
        const models = await llmProviderService.fetchModels(provider);
        return models.length > 0;
    } catch {
        return false;
    }
}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
	<div class="flex items-start justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">{t("title", { defaultValue: "LLM Providers" })}</h2>
			<p class="text-muted-foreground mt-1 text-sm">
				{t("subtitle", { defaultValue: "Manage your OpenAI-compatible LLM providers." })}
			</p>
		</div>
	</div>
	<ProviderList
		{providers}
		onUpdateProvider={handleUpdateProvider}
		onDeleteProvider={handleDeleteProvider}
		onCheckProviderHealth={handleCheckProviderHealth}
	/>
	{#if showAddForm}
		<AddProviderForm
			onAddProvider={handleAddProvider}
			onCancel={() => (showAddForm = false)}
		/>
	{:else}
		<Button onclick={() => (showAddForm = true)} class="self-start">
			<PlusIcon class="mr-2 size-4" />
			{t("new", { defaultValue: "New" })}
		</Button>
	{/if}
</div>
