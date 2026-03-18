<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../module-system/index";

const modules = getModules();
const helloComponents = $derived(modules.getAll<Component>("HelloComponent"));
const chatbotComponents = $derived(
	modules.getAll<Component>("ChatbotComponent"),
);
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if chatbotComponents.length > 0}
		<header class="flex items-center border-b px-6 py-3">
			<h1 class="text-xl font-bold tracking-tight">modAI</h1>
			<p class="text-muted-foreground ml-3 text-sm">Svelte · Vite · Tailwind · AI SDK</p>
		</header>
		<div class="flex-1 overflow-hidden">
			{#each chatbotComponents as ChatbotComp}
				<ChatbotComp />
			{/each}
		</div>
	{:else}
		<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
			<h1 class="text-4xl font-bold text-foreground">modAI</h1>
			<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>

			{#each helloComponents as HelloComp}
				<HelloComp />
			{/each}

			{#if helloComponents.length === 0}
				<p class="text-sm text-muted-foreground">No modules loaded.</p>
			{/if}
		</div>
	{/if}
</main>
