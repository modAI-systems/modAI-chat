<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../../module-system/index";

const modules = getModules();
const toolsComponents = $derived(
	modules.getAll<Component>("ToolsComponent"),
);
</script>

{#each toolsComponents as ToolsComp}
	<ToolsComp />
{/each}
