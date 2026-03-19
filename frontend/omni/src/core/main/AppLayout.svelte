<script lang="ts">
import { MessageSquare, Settings2 } from "lucide-svelte";
import type { Component } from "svelte";
import { getModules } from "../module-system/index";

const modules = getModules();
const chatbotComponents = $derived(
	modules.getAll<Component>("ChatbotComponent"),
);
const providerComponents = $derived(
	modules.getAll<Component>("LLMProviderManagementComponent"),
);

let currentPage = $state<"chat" | "settings">("chat");
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if chatbotComponents.length > 0}
		<header class="flex items-center justify-between border-b px-6 py-3">
			<div class="flex items-center">
				<h1 class="text-xl font-bold tracking-tight">modAI</h1>
				<p class="text-muted-foreground ml-3 text-sm">Svelte · Vite · Tailwind · AI SDK</p>
			</div>
			<nav class="flex gap-1">
				<button
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {currentPage === 'chat' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
					onclick={() => (currentPage = "chat")}
				>
					<MessageSquare class="size-4" />
					Chat
				</button>
				{#if providerComponents.length > 0}
					<button
						class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {currentPage === 'settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
						onclick={() => (currentPage = "settings")}
					>
						<Settings2 class="size-4" />
						Providers
					</button>
				{/if}
			</nav>
		</header>
		<div class="flex-1 overflow-hidden">
			{#if currentPage === "settings" && providerComponents.length > 0}
				{#each providerComponents as ProviderComp}
					<ProviderComp />
				{/each}
			{:else}
				{#each chatbotComponents as ChatbotComp}
					<ChatbotComp />
				{/each}
			{/if}
		</div>
	{:else}
		<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
			<h1 class="text-4xl font-bold text-foreground">modAI</h1>
			<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>
		</div>
	{/if}
</main>
