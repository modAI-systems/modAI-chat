<script lang="ts" module>
	import Settings2Icon from "@lucide/svelte/icons/settings-2";

	// This is sample data.
	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		settings: [
			{
				title: "LLM",
				url: "#",
				icon: Settings2Icon,
				items: [
					{
						title: "Providers",
						url: "#/providers",
					},
					{
						title: "Tools",
						url: "#/tools",
					},
				],
			},
		],
	};
</script>

<script lang="ts">
	import NavMain from "./nav-settings.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Content>
		<NavMain items={data.settings} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
