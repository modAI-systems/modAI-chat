<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";

const modules = getModules();
const toolsManagement = $derived(modules.getAll<Component>("ToolsManagement"));
</script>

{#each toolsManagement as ToolsComp}
	<ToolsComp />
{/each}
