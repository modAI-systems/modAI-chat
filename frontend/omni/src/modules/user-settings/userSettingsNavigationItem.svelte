<script lang="ts">
import { ChevronRight, UserCog } from "lucide-svelte";
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system";
import { getT } from "@/modules/i18n/index.svelte.js";
import { SIDEBAR_MENU_BUTTON_CLASS } from "@/modules/main-app-sidebar-based/lib/styles";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Collapsible from "$lib/shadcnui/components/ui/collapsible/index.js";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { cn } from "$lib/shadcnui/utils.js";

const USER_SETTINGS_PATH = "/user-settings";

const t = getT("user-settings");
const deps = getModuleDeps(
    "@/modules/user-settings/userSettingsNavigationItem",
);
const sidebarItems = $derived(
    deps.getAll<Component>("userSettingsSidebarItems"),
);

const router = getRouterApi();
let isOpen = $state(router.isActive.startsWith(USER_SETTINGS_PATH));
</script>

<Collapsible.Root bind:open={isOpen} class="group/collapsible">
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			isActive={false}
			class={SIDEBAR_MENU_BUTTON_CLASS}
			onclick={() => {
				isOpen = !isOpen;
			}}
		>
			<UserCog />
			<span>{t("navLabel", { defaultValue: "User Settings" })}</span>
			<ChevronRight
				class={cn("ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90")}
			/>
		</Sidebar.MenuButton>
		<Collapsible.Content>
			<Sidebar.MenuSub>
				{#each sidebarItems as SidebarItem, index (index)}
					<SidebarItem />
				{/each}
			</Sidebar.MenuSub>
		</Collapsible.Content>
	</Sidebar.MenuItem>
</Collapsible.Root>
