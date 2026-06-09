<script lang="ts">
import { Check, ChevronsUpDown } from "lucide-svelte";
import { getT, i18n } from "@/modules/i18n/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import * as Command from "$lib/shadcnui/components/ui/command/index.js";
import * as Popover from "$lib/shadcnui/components/ui/popover/index.js";

const t = getT("user-settings");

const languages = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
];

let selectedLanguage = $state(i18n.language?.slice(0, 2) ?? "en");
let open = $state(false);

const selectedLabel = $derived(
    languages.find((l) => l.code === selectedLanguage)?.label ??
        selectedLanguage,
);

function handleSelect(code: string) {
    selectedLanguage = code;
    open = false;
    void i18n.changeLanguage(code);
}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight">
			{t("localizationTitle", { defaultValue: "Language & Localization" })}
		</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			{t("localizationSubtitle", { defaultValue: "Configure your preferred language." })}
		</p>
	</div>

	<div class="flex flex-col gap-2">
		<span class="text-sm font-medium">
			{t("languageLabel", { defaultValue: "Language" })}
		</span>
		<Popover.Root bind:open>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						variant="outline"
						class="justify-between font-normal"
						{...props}
					>
						<span>{selectedLabel}</span>
						<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0" align="start">
				<Command.Root>
					<Command.Input placeholder={t("searchLanguage", { defaultValue: "Search language..." })} />
					<Command.List>
						<Command.Empty>{t("noLanguageFound", { defaultValue: "No language found." })}</Command.Empty>
						{#each languages as lang (lang.code)}
							<Command.Item
								value={lang.code}
								onSelect={() => handleSelect(lang.code)}
							>
								<span class="flex-1">{lang.label}</span>
								{#if selectedLanguage === lang.code}
									<Check class="size-4" />
								{/if}
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>
</div>
