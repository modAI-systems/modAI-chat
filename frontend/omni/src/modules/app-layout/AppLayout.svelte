<script lang="ts">
import type { Component } from "svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.ts";
import { getModules } from "../module-system/index";
import { ROUTE_TYPE, type RouteDefinition } from "./routeDefinition.svelte.ts";
import { getCurrentPath, navigate } from "./router.svelte";

const modules = getModules();
const routes = $derived(modules.getAll<RouteDefinition>(ROUTE_TYPE));
const sidebarComponents = $derived(
    modules.getAll<Component>("SidebarComponent"),
);

const currentPath = $derived(getCurrentPath());
const defaultRoute = $derived(routes.find((r) => r.isDefault) ?? routes[0]);
const activeRoute = $derived(
    routes.find((r) => r.path === currentPath) ?? defaultRoute,
);

$effect(() => {
    if (defaultRoute && currentPath === "/") {
        navigate(defaultRoute.path);
    }
});
</script>

<Sidebar.Provider>
	<div class="bg-background flex min-h-screen w-full flex-row overflow-hidden">
		<main class="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
			<header class="flex items-center justify-between border-b px-6 py-3">
				<div class="flex items-center">
					<button class="cursor-pointer" onclick={() => defaultRoute && navigate(defaultRoute.path)}>
						<h1 class="text-xl font-bold tracking-tight">modAI</h1>
					</button>
				</div>
				<nav class="flex items-center gap-1">
					{#if sidebarComponents.length > 0}
						<Sidebar.Trigger />
					{/if}
				</nav>
			</header>
			<div class="flex-1 overflow-hidden">
				{#if activeRoute}
					{@const ActiveComponent = activeRoute.component}
					<ActiveComponent />
				{/if}
			</div>
		</main>
		{#each sidebarComponents as SidebarComp}
			<SidebarComp />
		{/each}
	</div>
</Sidebar.Provider>
