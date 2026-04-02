<script lang="ts">
import type { Component } from "svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";

export interface SidebarNavigationItem {
    label: string;
    path: string;
    icon: Component;
}

let {
    items,
    onNavigate,
}: {
    items: SidebarNavigationItem[];
    onNavigate: (path: string) => void;
} = $props();

let hoveredPath: string | null = $state(null);
</script>

<Sidebar.Menu>
    {#each items as item (item.path)}
        <Sidebar.MenuItem>
            <Sidebar.MenuButton
                isActive={false}
                class={hoveredPath === item.path 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "bg-transparent text-sidebar-foreground data-[active=false]:bg-transparent data-[active=false]:text-sidebar-foreground"}
                onmouseenter={() => (hoveredPath = item.path)}
                onmouseleave={() => (hoveredPath = null)}
                onclick={() => onNavigate(item.path)}
            >
                <item.icon />
                <span>{item.label}</span>
            </Sidebar.MenuButton>
        </Sidebar.MenuItem>
    {/each}
</Sidebar.Menu>
