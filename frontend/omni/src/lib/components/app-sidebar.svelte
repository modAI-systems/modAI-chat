<script lang="ts">
import type { Component, ComponentProps } from "svelte";
import type { SidebarFooterItem } from "@/modules/sidebar/sidebarItem";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import NavUser from "./nav-user.svelte";

let {
    ref = $bindable(null),
    collapsible = "icon",
    contentItems = [],
    footerItem = null,
    ...restProps
}: ComponentProps<typeof Sidebar.Root> & {
    contentItems?: Component[];
    footerItem?: SidebarFooterItem | null;
} = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Content>
		{#each contentItems as ContentItem}
			<ContentItem />
		{/each}
	</Sidebar.Content>
	{#if footerItem}
		<Sidebar.Footer>
			<NavUser user={footerItem} />
		</Sidebar.Footer>
	{/if}
	<Sidebar.Rail />
</Sidebar.Root>
