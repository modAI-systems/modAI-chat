<script lang="ts">
import {
    CircleCheck,
    CircleX,
    HeartPulse,
    LoaderCircle,
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
import { Switch } from "$lib/shadcnui/components/ui/switch/index.js";

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

async function toggleEnabled(provider: Provider) {
    await onUpdateProvider(provider.id, { enabled: !provider.enabled });
}
</script>

{#if providers.length > 0}
	<div class="flex flex-col gap-3">
		{#each providers as provider (provider.id)}
			{@const healthState = healthByProviderId[provider.id] ?? "idle"}
			<Card.Root size="sm" class="py-0">
				<Card.Content class="flex flex-col gap-2 py-2 px-3">
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
							<button
								class="hover:text-foreground flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
								onclick={() => startEdit(provider)}
							>
								<p class="font-medium">{provider.name}</p>
								<p class="text-muted-foreground truncate text-xs">
									{provider.base_url}
								</p>
							</button>
							<div class="flex items-center gap-1">
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
									class="text-destructive hover:text-destructive size-8 p-0"
									onclick={() => deleteProvider(provider.id)}
								>
									<Trash2 class="size-4" />
								</Button>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span class="inline-flex items-center" onclick={(e) => e.stopPropagation()} role="presentation">
									<Switch
										checked={provider.enabled ?? false}
										class={provider.enabled ? "data-[state=checked]:bg-green-600" : ""}
										title={provider.enabled ? t("disableProvider", { defaultValue: "Disable provider" }) : t("enableProvider", { defaultValue: "Enable provider" })}
										onCheckedChange={() => void toggleEnabled(provider)}
									/>
								</span>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
