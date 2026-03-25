<script lang="ts">
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import type { ComponentProps } from "svelte";
import type { SidebarItem } from "@/modules/sidebar/sidebarItem";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import NavSettings from "./nav-settings.svelte";
import NavUser from "./nav-user.svelte";

let {
  ref = $bindable(null),
  collapsible = "icon",
  items = [],
  ...restProps
}: ComponentProps<typeof Sidebar.Root> & { items?: SidebarItem[] } = $props();

const navSettings = $derived([
  {
    title: "LLM",
    url: "#",
    icon: Settings2Icon,
    items: items.map((item) => ({
      title: item.title,
      url: item.url,
    })),
  },
]);
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Content>
		<NavSettings items={navSettings} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={{ name: "shadcn", email: "m@example.com", avatar: "/avatars/shadcn.jpg" }} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
