<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../../module-system/index";

const modules = getModules();
const chatbotComponents = $derived(
    modules.getAll<Component>("ChatbotComponent"),
);
</script>

{#each chatbotComponents as ChatbotComp}
	<ChatbotComp />
{/each}
