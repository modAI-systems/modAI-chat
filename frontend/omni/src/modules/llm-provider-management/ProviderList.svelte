<script lang="ts">
import {
    CircleCheck,
    CircleX,
    HeartPulse,
    LoaderCircle,
    Settings2,
    Trash2,
} from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import type {
    CreateProviderRequest,
    Provider,
} from "@/modules/llm-provider-service/index.svelte";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Card from "$lib/shadcnui/components/ui/card/index.js";
import { Input } from "$lib/shadcnui/components/ui/input/index.js";

const t = getT("llm-provider-management");

let { providers, onUpdateProvider, onDeleteProvider, onCheckProviderHealth } =
    $props<{
        providers: Provider[];
        onUpdateProvider: (
            id: string,
            data: Partial<CreateProviderRequest>,
        ) => void | Promise<void>;
        onDeleteProvider: (id: string) => void | Promise<void>;
        onCheckProviderHealth: (provider: Provider) => Promise<boolean>;
    }>();

let editingId = $state<string | null>(null);
let editName = $state("");
let editBaseUrl = $state("");
let editApiKey = $state("");
let healthByProviderId = $state<
    Record<string, "idle" | "checking" | "ok" | "fail">
>({});

function startEdit(provider: Provider) {
    editingId = provider.id;
    editName = provider.name;
    editBaseUrl = provider.base_url;
    editApiKey = provider.api_key;
}

async function saveEdit(id: string) {
    try {
        await onUpdateProvider(id, {
            name: editName,
            base_url: editBaseUrl,
            api_key: editApiKey,
        });
        editingId = null;
    } catch (err) {
        // Stay in edit mode so users can fix invalid input.
        console.error(err);
    }
}

function cancelEdit() {
    editingId = null;
}

async function deleteProvider(id: string) {
    await onDeleteProvider(id);
    if (editingId === id) editingId = null;
    const next = { ...healthByProviderId };
    delete next[id];
    healthByProviderId = next;
}

async function checkHealth(provider: Provider) {
    healthByProviderId = { ...healthByProviderId, [provider.id]: "checking" };
    const healthy = await onCheckProviderHealth(provider);
    healthByProviderId = {
        ...healthByProviderId,
        [provider.id]: healthy ? "ok" : "fail",
    };
}
</script>

{#if providers.length > 0}
	<div class="flex flex-col gap-3">
		{#each providers as provider (provider.id)}
			{@const healthState = healthByProviderId[provider.id] ?? "idle"}
			<Card.Root>
				<Card.Content class="flex flex-col gap-3 p-4">
					{#if editingId === provider.id}
						<div class="flex flex-col gap-2">
						<Input bind:value={editName} placeholder={t("editProviderNamePlaceholder", { defaultValue: "Provider Name" })} />
						<Input bind:value={editBaseUrl} placeholder={t("editBaseUrlPlaceholder", { defaultValue: "Base URL" })} />
							<Input
								type="password"
								bind:value={editApiKey}
									placeholder={t("editApiKeyPlaceholder", { defaultValue: "API Key" })}
							/>
							<div class="flex gap-2">
								<Button size="sm" onclick={() => saveEdit(provider.id)}>
								{t("save", { defaultValue: "Save" })}
							</Button>
							<Button size="sm" variant="outline" onclick={cancelEdit}>
								{t("cancel", { defaultValue: "Cancel" })}
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
									class="size-8 p-0 {healthState === 'ok' ? 'text-green-600 hover:text-green-700' : ''} {healthState === 'fail' ? 'text-red-600 hover:text-red-700' : ''}"
									title={t("checkHealth", { defaultValue: "Check provider health" })}
								onclick={() => checkHealth(provider)}
								>
									{#if healthState === "checking"}
										<LoaderCircle class="size-4 animate-spin" />
									{:else if healthState === "ok"}
										<CircleCheck class="size-4" />
									{:else if healthState === "fail"}
										<CircleX class="size-4" />
									{:else}
										<HeartPulse class="size-4" />
									{/if}
								</Button>
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
