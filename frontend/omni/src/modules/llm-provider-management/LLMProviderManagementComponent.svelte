<script lang="ts">
import { AlertTriangle, ChevronDown } from "lucide-svelte";
import { getModuleDeps } from "@/core/module-system/index.js";
import AddProviderForm from "@/modules/llm-provider-management/AddProviderForm.svelte";
import ProviderList from "@/modules/llm-provider-management/ProviderList.svelte";
import type {
    CreateProviderRequest,
    LLMProviderService,
    Provider,
} from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Card from "$lib/shadcnui/components/ui/card/index.js";
import * as Collapsible from "$lib/shadcnui/components/ui/collapsible/index.js";

const deps = getModuleDeps(
    "@/modules/llm-provider-management/LLMProviderManagementComponent",
);
const llmProviderService =
    deps.getOne<LLMProviderService>("llmProviderService");
let providers = $state<Provider[]>([]);

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
