<script lang="ts">
import { getT } from "@/modules/i18n/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";

const t = getT("chat");

const defaultSuggestions = [
    "What are the latest trends in AI?",
    "How does machine learning work?",
    "Explain quantum computing",
    "Best practices for Svelte development",
    "Tell me about TypeScript benefits",
    "How to optimize database queries?",
    "What is the difference between SQL and NoSQL?",
    "Explain cloud computing basics",
];

const suggestions = $derived(
    t("suggestions", {
        returnObjects: true,
        defaultValue: defaultSuggestions,
    }) as string[],
);

let {
    onselect,
}: {
    onselect: (text: string) => void;
} = $props();
</script>

<div class="flex flex-wrap justify-center gap-2 border-b px-4 py-3">
	{#each suggestions as suggestion}
		<Button
			variant="outline"
			size="sm"
			class="h-auto px-3 py-1.5 text-xs"
			onclick={() => onselect(suggestion)}
		>
			{suggestion}
		</Button>
	{/each}
</div>
