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
    isActive,
    onNavigate,
}: {
    items: SidebarNavigationItem[];
    isActive: (path: string) => boolean;
    onNavigate: (path: string) => void;
} = $props();
</script>

<Sidebar.Menu>
    {#each items as item (item.path)}
        <Sidebar.MenuItem>
            <Sidebar.MenuButton
                isActive={isActive(item.path)}
                onclick={() => onNavigate(item.path)}
            >
                <item.icon />
                <span>{item.label}</span>
            </Sidebar.MenuButton>
        </Sidebar.MenuItem>
    {/each}
</Sidebar.Menu>
