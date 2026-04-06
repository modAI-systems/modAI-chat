<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import SidebarLayout from "./SidebarLayout.svelte";

const deps = getModuleDeps("@/modules/main-app-sidebar-based/MainApp");
const sidebarTopItems = $derived(deps.getAll<Component>("sidebarTopItems"));
const { children } = $props();
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if sidebarTopItems.length > 0}
		<SidebarLayout>
			{#snippet sidebar()}
				<Sidebar.Menu>
					{#each sidebarTopItems as SidebarTopItem, index (index)}
						<SidebarTopItem />
					{/each}
				</Sidebar.Menu>
			{/snippet}

			{@render children?.()}
		</SidebarLayout>
	{:else}
		<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
			<h1 class="text-4xl font-bold text-foreground">modAI</h1>
			<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>
		</div>
	{/if}
</main>
