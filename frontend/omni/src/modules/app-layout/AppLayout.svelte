<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import type { Component } from "svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import { getModules } from "../module-system/index";
import { AppRoute, getCurrentRoute, navigate } from "./router.svelte";

const modules = getModules();
const chatRoute = $derived(modules.getOne<Component>("ChatRoute"));
const providersRoute = $derived(modules.getOne<Component>("ProvidersRoute"));
const toolsRoute = $derived(modules.getOne<Component>("ToolsRoute"));
const sidebarComponents = $derived(
    modules.getAll<Component>("SidebarComponent"),
);

const currentRoute = $derived(getCurrentRoute());
const isChatRouteActive = $derived(currentRoute === AppRoute.Chat);
</script>

<Sidebar.Provider>
	<div class="bg-background flex min-h-screen w-full flex-row overflow-hidden">
		<main class="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
			{#if chatRoute}
				<header class="flex items-center justify-between border-b px-6 py-3">
					<div class="flex items-center">
						<h1 class="text-xl font-bold tracking-tight">modAI</h1>
						<p class="text-muted-foreground ml-3 text-sm">Svelte · Vite · Tailwind · AI SDK</p>
					</div>
					<nav class="flex items-center gap-1">
						<button
							class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {isChatRouteActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
							onclick={() => navigate(AppRoute.Chat)}
						>
							<MessageSquare class="size-4" />
							Chat
						</button>
						{#if sidebarComponents.length > 0}
							<Sidebar.Trigger />
						{/if}
					</nav>
				</header>
				<div class="flex-1 overflow-hidden">
					{#if currentRoute === AppRoute.Providers && providersRoute}
						{@const ProvidersRoute = providersRoute}
						<ProvidersRoute />
					{:else if currentRoute === AppRoute.Tools && toolsRoute}
						{@const ToolsRoute = toolsRoute}
						<ToolsRoute />
					{:else}
						{@const ChatRoute = chatRoute}
						<ChatRoute />
					{/if}
				</div>
			{:else}
				<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
					<h1 class="text-4xl font-bold text-foreground">modAI</h1>
					<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>
				</div>
			{/if}
		</main>

		{#each sidebarComponents as SidebarComp}
			<SidebarComp />
		{/each}
	</div>
</Sidebar.Provider>
