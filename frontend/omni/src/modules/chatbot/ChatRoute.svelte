<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";

const deps = getModuleDeps("@/modules/chatbot/chatRouteDefinition/create");
const chatbotComponents = $derived(deps.getAll<Component>("chatbots"));
</script>

{#each chatbotComponents as ChatbotComp}
	<ChatbotComp />
{/each}
