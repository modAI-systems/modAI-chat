<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../../module-system/index";

const modules = getModules();
const providerComponents = $derived(
	modules.getAll<Component>("LLMProviderManagementComponent"),
);
const chatbotComponents = $derived(
	modules.getAll<Component>("ChatbotComponent"),
);
</script>

{#if providerComponents.length > 0}
	{#each providerComponents as ProviderComp}
		<ProviderComp />
	{/each}
{:else}
	{#each chatbotComponents as ChatbotComp}
		<ChatbotComp />
	{/each}
{/if}
