<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../../module-system/index";

const modules = getModules();
const toolsManagement = $derived(
	modules.getAll<Component>("ToolsManagement"),
);
</script>

{#each toolsManagement as ToolsComp}
	<ToolsComp />
{/each}
