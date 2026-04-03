<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";

const deps = getModuleDeps(
  "@/modules/tools-management/toolsRouteDefinition/create",
);
const toolsManagementComponents = $derived(
  deps.getAll<Component>("toolsManagement"),
);
</script>

{#each toolsManagementComponents as ToolsManagementComp}
	<ToolsManagementComp />
{/each}
