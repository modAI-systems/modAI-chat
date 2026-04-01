<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";

const deps = getModuleDeps("@/modules/chat/chatRouteDefinition/create");
const chatComponents = $derived(deps.getAll<Component>("chat"));
</script>

{#each chatComponents as ChatComp}
	<ChatComp />
{/each}
