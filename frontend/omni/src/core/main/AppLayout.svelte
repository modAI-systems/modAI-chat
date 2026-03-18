<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../module-system/index";

const modules = getModules();
const helloComponents = $derived(modules.getAll<Component>("HelloComponent"));
</script>

<main class="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-8">
	<h1 class="text-4xl font-bold text-gray-900">modAI</h1>
	<p class="text-gray-500">Svelte · Rsbuild · Tailwind · Module System</p>

	{#each helloComponents as HelloComp}
		<HelloComp />
	{/each}

	{#if helloComponents.length === 0}
		<p class="text-sm text-gray-400">No modules loaded.</p>
	{/if}
</main>
