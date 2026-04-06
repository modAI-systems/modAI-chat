<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";

const deps = getModuleDeps(
    "@/modules/llm-provider-management/providersRouteDefinition/create",
);
const providerComponents = $derived(
    deps.getAll<Component>("providerManagement"),
);
</script>

{#each providerComponents as ProviderComp}
	<ProviderComp />
{/each}
