<script lang="ts">
import type { Component } from "svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.ts";
import { getModules } from "../module-system/index";
import Router from "./Router.svelte";
import { navigateHome } from "./router.svelte.ts";

const modules = getModules();
const sidebarComponents = $derived(
    modules.getAll<Component>("SidebarComponent"),
);
</script>

<Sidebar.Provider>
	<div class="bg-background flex min-h-screen w-full flex-row overflow-hidden">
		<main class="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
			<header class="flex items-center justify-between border-b px-6 py-3">
				<div class="flex items-center">
					<button class="cursor-pointer" onclick={navigateHome}>
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
				<Router />
			</div>
		</main>
		{#each sidebarComponents as SidebarComp}
			<SidebarComp />
		{/each}
	</div>
</Sidebar.Provider>
