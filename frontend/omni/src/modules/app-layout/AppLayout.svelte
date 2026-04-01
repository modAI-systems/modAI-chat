<script lang="ts">
import { MessageSquare, Settings2 } from "lucide-svelte";
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";
import { getAppRouter } from "./AppRouter.svelte";

const deps = getModuleDeps("@/modules/app-layout/AppLayout");
const chatComponents = $derived(deps.getAll<Component>("chat"));
const providerComponents = $derived(
  deps.getAll<Component>("providerManagement"),
);
const appRouter = getAppRouter();
const { children } = $props();
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if chatComponents.length > 0}
		<header class="flex items-center justify-between border-b px-6 py-3">
			<div class="flex items-center">
				<h1 class="text-xl font-bold tracking-tight">modAI</h1>
				<p class="text-muted-foreground ml-3 text-sm">Svelte · Vite · Tailwind · AI SDK</p>
			</div>
			<nav class="flex gap-1">
				<button
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {appRouter.isActive('/') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
					onclick={() => appRouter.navigate(appRouter.p("/"))}
				>
					<MessageSquare class="size-4" />
					Chat
				</button>
				{#if providerComponents.length > 0}
					<button
						class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {appRouter.isActive('/providers') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
						onclick={() => appRouter.navigate(appRouter.p("/providers"))}
					>
						<Settings2 class="size-4" />
						Providers
					</button>
				{/if}
			</nav>
		</header>
		<div class="flex-1 overflow-hidden">
			{@render children?.()}
		</div>
	{:else}
		<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
			<h1 class="text-4xl font-bold text-foreground">modAI</h1>
			<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>
		</div>
	{/if}
</main>
