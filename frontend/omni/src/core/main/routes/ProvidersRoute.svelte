<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../../module-system/index";

const modules = getModules();
const providerComponents = $derived(
	modules.getAll<Component>("LLMProviderManagementComponent"),
);
</script>

{#each providerComponents as ProviderComp}
	<ProviderComp />
{/each}
