<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system";
import { getT } from "@/modules/i18n/index.svelte.js";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import SidebarLayout from "./SidebarLayout.svelte";

const t = getT("main-app-sidebar-based");

const deps = getModuleDeps("@/modules/main-app-sidebar-based/MainApp");
const sidebarTopItems = $derived(deps.getAll<Component>("sidebarTopItems"));
const sidebarBottomItems = $derived(
    deps.getAll<Component>("sidebarBottomItems"),
);
const hasHeaderItems = $derived(sidebarTopItems.length > 0);
const hasFooterItems = $derived(sidebarBottomItems.length > 0);
const { children } = $props();
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if hasHeaderItems || hasFooterItems}
		<SidebarLayout>
            {#snippet sidebarHeader()}
                {#if hasHeaderItems}
                    <Sidebar.Menu>
                        {#each sidebarTopItems as SidebarTopItem, index (index)}
                            <SidebarTopItem />
                        {/each}
                    </Sidebar.Menu>
                {/if}
            {/snippet}

            {#snippet sidebarFooter()}
                {#if hasFooterItems}
                    <Sidebar.Menu>
                        {#each sidebarBottomItems as SidebarBottomItem, index (index)}
                            <SidebarBottomItem />
                        {/each}
                    </Sidebar.Menu>
                {/if}
            {/snippet}

			{@render children?.()}
		</SidebarLayout>
	{:else}
		{@render children?.()}
	{/if}
</main>
