<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";

const modules = getModules();
const chatComponents = $derived(modules.getAll<Component>("Chat"));
</script>

{#each chatComponents as ChatComp}
	<ChatComp />
{/each}
