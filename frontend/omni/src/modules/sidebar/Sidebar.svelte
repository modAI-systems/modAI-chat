<script lang="ts">
import { getModules } from "@/core/module-system/index";
import AppSidebar from "$lib/components/app-sidebar.svelte";
import {
	SIDEBAR_SETTING_ITEM_TYPE,
	SIDEBAR_USER_ITEM_TYPE,
	type SidebarSettingItem,
	type SidebarUserItem,
} from "./sidebarItem";

const modules = getModules();
const settingItems = $derived(modules.getAll<SidebarSettingItem>(SIDEBAR_SETTING_ITEM_TYPE));
const userItem = $derived(modules.getOne<SidebarUserItem>(SIDEBAR_USER_ITEM_TYPE));
</script>

<AppSidebar side="right" settingItems={settingItems} {userItem} />
