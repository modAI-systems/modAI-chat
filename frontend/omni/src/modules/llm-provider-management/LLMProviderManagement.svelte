<script lang="ts">
import { AlertTriangle, ChevronDown } from "lucide-svelte";
import {
  type CreateProviderRequest,
  llmProviderService,
} from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import * as Collapsible from "$lib/components/ui/collapsible/index.js";
import AddProviderForm from "./AddProviderForm.svelte";
import ProviderList from "./ProviderList.svelte";

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

	<Collapsible.Root>
		<Card.Root class="border-amber-300/60 bg-amber-50 text-amber-950">
			<Card.Header class="pb-2">
				<div class="flex items-center justify-between gap-2">
					<Card.Title class="flex items-center gap-2 text-sm">
						<AlertTriangle class="size-4" />
						Browser-direct mode requires CORS on your provider
					</Card.Title>
					<Collapsible.Trigger asChild>
						{#snippet child({ props })}
							<Button variant="outline" size="sm" class="gap-1.5" {...props}>
								Show setup
								<ChevronDown class="size-3.5" />
							</Button>
						{/snippet}
					</Collapsible.Trigger>
				</div>
			</Card.Header>
			<Collapsible.Content>
				<Card.Content class="space-y-2 pt-0 text-sm">
					<p>
						This light frontend calls providers directly from the browser. If your provider does not allow your frontend origin, model loading, health checks, and chat will fail.
					</p>
					<p class="font-medium">llmock example:</p>
					<pre class="overflow-x-auto rounded bg-amber-100/80 px-2 py-1 text-xs">docker run --rm -p 3002:8000 -e LLMOCK_CORS_ALLOW_ORIGINS='["http://localhost:5175"]' ghcr.io/modai-systems/llmock:latest</pre>
					<p>
						If you use another frontend port, add that origin too (for example: ["http://localhost:5175","http://localhost:4173"]).
					</p>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<ProviderList
		{providers}
		onUpdateProvider={handleUpdateProvider}
		onDeleteProvider={handleDeleteProvider}
		onCheckProviderHealth={handleCheckProviderHealth}
	/>

	<AddProviderForm onAddProvider={handleAddProvider} />
</div>
