<script lang="ts">
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import type { ComponentProps } from "svelte";
import type {
    SidebarSettingItem,
    SidebarUserItem,
} from "@/modules/sidebar/sidebarItem";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import NavSettings from "./nav-settings.svelte";
import NavUser from "./nav-user.svelte";

let {
    ref = $bindable(null),
    collapsible = "icon",
    settingItems = [],
    userItem = null,
    ...restProps
}: ComponentProps<typeof Sidebar.Root> & {
    settingItems?: SidebarSettingItem[];
    userItem?: SidebarUserItem | null;
} = $props();

const navSettings = $derived([
    {
        title: "LLM",
        url: "#",
        icon: Settings2Icon,
        items: settingItems.map((item) => ({
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
	{#if userItem}
		<Sidebar.Footer>
			<NavUser user={userItem} />
		</Sidebar.Footer>
	{/if}
	<Sidebar.Rail />
</Sidebar.Root>
