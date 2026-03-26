<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";

const modules = getModules();
const providerComponents = $derived(
    modules.getAll<Component>("LLMProviderManagement"),
);
</script>

{#each providerComponents as ProviderComp}
	<ProviderComp />
{/each}
