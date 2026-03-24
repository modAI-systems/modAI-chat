<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import type { Component } from "svelte";
import Router from "svelte-spa-router";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import { getModules } from "../module-system/index";
import ChatRoute from "./routes/ChatRoute.svelte";
import ProvidersRoute from "./routes/ProvidersRoute.svelte";
import ToolsRoute from "./routes/ToolsRoute.svelte";

const modules = getModules();
const chatbotComponents = $derived(
  modules.getAll<Component>("ChatbotComponent"),
);
const sidebarComponents = $derived(
	modules.getAll<Component>("SidebarComponent"),
);

const AppRoute = {
	Chat: "/chat",
	Providers: "/providers",
	Tools: "/tools",
} as const;

type AppRoute = (typeof AppRoute)[keyof typeof AppRoute];

const routes = {
	"/": ChatRoute,
	[AppRoute.Chat]: ChatRoute,
	[AppRoute.Providers]: ProvidersRoute,
	[AppRoute.Tools]: ToolsRoute,
	"*": ChatRoute,
};

let currentRoutePath = $state<AppRoute>(AppRoute.Chat);
const isChatRouteActive = $derived(currentRoutePath === AppRoute.Chat);

function parseRoutePath(path: string): AppRoute {
	switch (path) {
		case AppRoute.Providers:
			return AppRoute.Providers;
		case AppRoute.Tools:
			return AppRoute.Tools;
		default:
			return AppRoute.Chat;
	}
}

function getRoutePathFromHash() {
	if (typeof window === "undefined") {
		return AppRoute.Chat;
	}

	const hash = window.location.hash;
	if (hash.startsWith("#/")) {
		const routePath = hash.slice(1).split("?")[0] || AppRoute.Chat;
		return parseRoutePath(routePath);
	}

	return AppRoute.Chat;
}

function setCurrentRoutePath(path: AppRoute) {
	currentRoutePath = path;

	if (typeof window === "undefined") {
		return;
	}

	const nextHash = `#${path}`;
	if (window.location.hash !== nextHash) {
		window.location.hash = nextHash;
	}
}

function handleHashChange() {
	currentRoutePath = getRoutePathFromHash();
}

if (typeof window !== "undefined") {
	handleHashChange();
}
</script>

<svelte:window onhashchange={handleHashChange} />

<Sidebar.Provider>
	<div class="bg-background flex min-h-screen w-full flex-row overflow-hidden">
		<main class="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
			{#if chatbotComponents.length > 0}
				<header class="flex items-center justify-between border-b px-6 py-3">
					<div class="flex items-center">
						<h1 class="text-xl font-bold tracking-tight">modAI</h1>
						<p class="text-muted-foreground ml-3 text-sm">Svelte · Vite · Tailwind · AI SDK</p>
					</div>
					<nav class="flex items-center gap-1">
						<button
							class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {isChatRouteActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'}"
							onclick={() => setCurrentRoutePath(AppRoute.Chat)}
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
					<Router {routes} />
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
