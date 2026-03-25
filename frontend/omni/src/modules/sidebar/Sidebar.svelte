<script lang="ts">
import { getModules } from "@/core/module-system/index";
import AppSidebar from "$lib/components/app-sidebar.svelte";
import { SIDEBAR_ITEM_TYPE, type SidebarItem } from "./sidebarItem";

const modules = getModules();
const sidebarItems = $derived(modules.getAll<SidebarItem>(SIDEBAR_ITEM_TYPE));
</script>

<AppSidebar side="right" items={sidebarItems} />
