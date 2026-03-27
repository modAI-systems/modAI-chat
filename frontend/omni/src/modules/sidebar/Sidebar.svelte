<script lang="ts">
import { getModules } from "@/core/module-system/index";
import AppSidebar from "$lib/components/app-sidebar.svelte";
import {
    SIDEBAR_CONTENT_ITEM_TYPE,
    SIDEBAR_FOOTER_ITEM_TYPE,
    type SidebarContentItem,
    type SidebarFooterItem,
} from "./sidebarItem";

const modules = getModules();
const contentItems = $derived(
    modules.getAll<SidebarContentItem>(SIDEBAR_CONTENT_ITEM_TYPE),
);
const footerItems = $derived(
    modules.getAll<SidebarFooterItem>(SIDEBAR_FOOTER_ITEM_TYPE),
);
</script>

<AppSidebar side="right" {contentItems} {footerItems} />
