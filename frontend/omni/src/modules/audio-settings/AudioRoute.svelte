<script lang="ts">
import { Check, ChevronDown, Mic } from "lucide-svelte";
import { getModuleDeps } from "@/core/module-system/index.js";
import { getT } from "@/modules/i18n/index.svelte.js";
import type {
    LLMProviderService,
    Provider,
    ProviderModel,
} from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Command from "$lib/shadcnui/components/ui/command/index.js";
import * as Popover from "$lib/shadcnui/components/ui/popover/index.js";
import {
    getRealtimeModel,
    getTranscriptModel,
    isRealtimeModel,
    setRealtimeModel,
    setTranscriptModel,
} from "./audioSettings.svelte.js";

const deps = getModuleDeps(
    "@/modules/audio-settings/audioRouteDefinition/create",
);
const llmProviderService =
    deps.getOne<LLMProviderService>("llmProviderService");
const t = getT("audio-settings");

let allModels = $state<ProviderModel[]>([]);
let loading = $state(true);
let voiceOpen = $state(false);
let transcriptOpen = $state(false);

const realtimeModels = $derived(
    allModels.filter((m) => isRealtimeModel(m.modelId)),
);
const voiceDisplayModels = $derived(
    realtimeModels.length > 0 ? realtimeModels : allModels,
);
const noRealtimeModels = $derived(
    realtimeModels.length === 0 && allModels.length > 0,
);
const voiceProviderGroups = $derived(
    [...new Set(voiceDisplayModels.map((m) => m.providerName))].map((name) => ({
        name,
        models: voiceDisplayModels.filter((m) => m.providerName === name),
    })),
);
const transcriptProviderGroups = $derived(
    [...new Set(allModels.map((m) => m.providerName))].map((name) => ({
        name,
        models: allModels.filter((m) => m.providerName === name),
    })),
);

const selectedVoiceModel = $derived(getRealtimeModel());
const selectedTranscriptModel = $derived(getTranscriptModel());

$effect(() => {
    void loadModels();
});

async function loadModels() {
    loading = true;
    try {
        let providers: Provider[] = [];
        try {
            providers = await llmProviderService.fetchProviders();
        } catch {
            // no providers configured
        }
        const results = await Promise.allSettled(
            providers.map((p) => llmProviderService.fetchModels(p)),
        );
        allModels = results.flatMap((r) =>
            r.status === "fulfilled" ? r.value : [],
        );
    } finally {
        loading = false;
    }
}

/** Used only as a stable string key for Command's search index. */
function modelKey(model: ProviderModel): string {
    return `${model.providerName}/${model.modelName}`;
}

function isSameModel(a: ProviderModel | null, b: ProviderModel): boolean {
    return a?.providerName === b.providerName && a?.modelName === b.modelName;
}

function handleVoiceSelect(model: ProviderModel) {
    setRealtimeModel(model);
    voiceOpen = false;
}

function handleTranscriptSelect(model: ProviderModel) {
    setTranscriptModel(model);
    transcriptOpen = false;
}
</script>

<div class="flex flex-col gap-6 px-4 py-8">
	<div>
		<h2 class="flex items-center gap-2 text-2xl font-semibold tracking-tight">
			<Mic class="size-5" />
			{t("title", { defaultValue: "Audio" })}
		</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			{t("subtitle", { defaultValue: "Configure the model used for real-time voice chat." })}
		</p>
	</div>

	<div class="flex flex-col gap-3">
		<!-- Voice model row -->
		<div class="flex items-center gap-6">
			<span class="flex-1 text-sm font-medium">
				{t("modelLabel", { defaultValue: "Realtime voice model" })}
			</span>

			{#if loading}
				<p class="text-muted-foreground w-[250px] text-right text-sm">
					{t("loadingModels", { defaultValue: "Loading models..." })}
				</p>
			{:else if allModels.length === 0}
				<p class="text-muted-foreground w-[250px] text-right text-sm">
					{t("noProviders", { defaultValue: "No providers configured. Add a provider in Global Settings → Providers first." })}
				</p>
			{:else}
				<Popover.Root bind:open={voiceOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								size="sm"
								class="w-[250px] justify-between text-xs"
								{...props}
							>
								{selectedVoiceModel?.modelName ??
									t("selectModel", { defaultValue: "Select model" })}
								<ChevronDown class="size-3" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-[250px] p-0" align="end">
						<Command.Root>
							<Command.Input
								placeholder={t("searchModels", { defaultValue: "Search models..." })}
							/>
							<Command.List>
								<Command.Empty
									>{t("noModelsFound", { defaultValue: "No models found." })}</Command.Empty
								>
								{#each voiceProviderGroups as group}
									<Command.Group heading={group.name}>
										{#each group.models as m}
											<Command.Item
											value={modelKey(m)}
											onSelect={() => handleVoiceSelect(m)}
										>
											<span class="flex-1">{m.modelName}</span>
											{#if isSameModel(selectedVoiceModel, m)}
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
			{/if}
		</div>

		<!-- Transcript model row -->
		<div class="flex items-center gap-6">
			<span class="flex-1 text-sm font-medium">
				{t("transcriptModelLabel", { defaultValue: "Transcript model" })}
			</span>

			{#if loading}
				<p class="text-muted-foreground w-[250px] text-right text-sm">
					{t("loadingModels", { defaultValue: "Loading models..." })}
				</p>
			{:else if allModels.length === 0}
				<p class="text-muted-foreground w-[250px] text-right text-sm">
					{t("noProviders", { defaultValue: "No providers configured. Add a provider in Global Settings → Providers first." })}
				</p>
			{:else}
				<Popover.Root bind:open={transcriptOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								size="sm"
								class="w-[250px] justify-between text-xs"
								{...props}
							>
								{selectedTranscriptModel?.modelName ??
									t("selectModel", { defaultValue: "Select model" })}
								<ChevronDown class="size-3" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-[250px] p-0" align="end">
						<Command.Root>
							<Command.Input
								placeholder={t("searchModels", { defaultValue: "Search models..." })}
							/>
							<Command.List>
								<Command.Empty
									>{t("noModelsFound", { defaultValue: "No models found." })}</Command.Empty
								>
								{#each transcriptProviderGroups as group}
									<Command.Group heading={group.name}>
										{#each group.models as m}
											<Command.Item
											value={modelKey(m)}
											onSelect={() => handleTranscriptSelect(m)}
										>
											<span class="flex-1">{m.modelName}</span>
											{#if isSameModel(selectedTranscriptModel, m)}
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
			{/if}
		</div>

		{#if !loading && allModels.length > 0}
			{#if noRealtimeModels}
				<p class="text-muted-foreground text-xs">
					{t("noRealtimeModels", { defaultValue: "No dedicated realtime models found — showing all models. Only models with 'realtime' in their name support voice." })}
				</p>
			{/if}
			<p class="text-muted-foreground text-xs">
				{t("modelHint", { defaultValue: "Only gpt-4o-realtime-preview or gpt-4o-mini-realtime-preview work for voice." })}
			</p>
		{/if}
	</div>
</div>

