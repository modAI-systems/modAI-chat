<script lang="ts">
import { LoaderCircle } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import type { CreateProviderRequest } from "@/modules/llm-provider-service/index.svelte";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Card from "$lib/shadcnui/components/ui/card/index.js";
import { Input } from "$lib/shadcnui/components/ui/input/index.js";

const t = getT("llm-provider-management");

let { onAddProvider, onCancel } = $props<{
    onAddProvider: (data: CreateProviderRequest) => void | Promise<void>;
    onCancel: () => void;
}>();

let newProviderName = $state("");
let newProviderBaseUrl = $state("");
let newProviderApiKey = $state("");
let addProviderError = $state("");
let addingProvider = $state(false);

async function handleAddProvider(e: SubmitEvent) {
    e.preventDefault();
    addProviderError = "";
    addingProvider = true;
    try {
        await onAddProvider({
            name: newProviderName,
            base_url: newProviderBaseUrl,
            api_key: newProviderApiKey,
        });
        newProviderName = "";
        newProviderBaseUrl = "";
        newProviderApiKey = "";
        onCancel();
    } catch (err) {
        addProviderError =
            err instanceof Error
                ? err.message
                : t("failedToAdd", { defaultValue: "Failed to add provider" });
    } finally {
        addingProvider = false;
    }
}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">
			{t("newProvider", { defaultValue: "New Provider" })}
		</Card.Title>
	</Card.Header>
	<Card.Content>
		<form onsubmit={handleAddProvider} class="flex flex-col gap-3">
			<div class="flex flex-col gap-1.5">
				<label for="provider-name" class="text-sm font-medium">
					{t("providerName", { defaultValue: "Provider Name" })}
				</label>
				<Input
					id="provider-name"
					bind:value={newProviderName}
					placeholder={t("providerNamePlaceholder", { defaultValue: "My Provider" })}
					required
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="provider-url" class="text-sm font-medium">
					{t("baseUrl", { defaultValue: "Base URL" })}
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
					{t("apiKey", { defaultValue: "API Key (optional)" })}
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
			<div class="flex gap-2">
				<Button type="submit" disabled={addingProvider}>
					{#if addingProvider}
						<LoaderCircle class="mr-2 size-4 animate-spin" />
					{/if}
					{t("save", { defaultValue: "Save" })}
				</Button>
				<Button type="button" variant="outline" onclick={onCancel}>
					{t("cancel", { defaultValue: "Cancel" })}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
