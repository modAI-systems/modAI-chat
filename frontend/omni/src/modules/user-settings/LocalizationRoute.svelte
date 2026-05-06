<script lang="ts">
import { getT, i18n } from "@/modules/i18n/index.svelte.js";

const t = getT("user-settings");

const languages = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
];

let selectedLanguage = $state(i18n.language?.slice(0, 2) ?? "en");

function handleLanguageChange(event: Event) {
    const lang = (event.target as HTMLSelectElement).value;
    selectedLanguage = lang;
    void i18n.changeLanguage(lang);
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
		<label class="text-sm font-medium" for="language-select">
			{t("languageLabel", { defaultValue: "Language" })}
		</label>
		<select
			id="language-select"
			class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full max-w-xs rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			value={selectedLanguage}
			onchange={handleLanguageChange}
		>
			{#each languages as lang (lang.code)}
				<option value={lang.code}>{lang.label}</option>
			{/each}
		</select>
	</div>
</div>
