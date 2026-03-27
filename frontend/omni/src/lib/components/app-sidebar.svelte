<script lang="ts">
import type { Component, ComponentProps } from "svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";

let {
    ref = $bindable(null),
    collapsible = "icon",
    contentItems = [],
    footerItems = [],
    ...restProps
}: ComponentProps<typeof Sidebar.Root> & {
    contentItems?: Component[];
    footerItems?: Component[];
} = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Content>
		{#each contentItems as ContentItem}
			<ContentItem />
		{/each}
	</Sidebar.Content>
	{#if footerItems.length > 0}
		<Sidebar.Footer>
			{#each footerItems as FooterItem}
				<FooterItem />
			{/each}
		</Sidebar.Footer>
	{/if}
	<Sidebar.Rail />
</Sidebar.Root>
