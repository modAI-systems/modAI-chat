<script lang="ts">
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import { getModules } from "@/core/module-system/index";
import NavSettings from "$lib/components/nav-settings.svelte";
import {
    SIDEBAR_SETTING_ITEM_TYPE,
    type SidebarSettingItem,
} from "./sidebarSettingItem";

const modules = getModules();
const settingItems = $derived(
    modules.getAll<SidebarSettingItem>(SIDEBAR_SETTING_ITEM_TYPE),
);

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

<NavSettings items={navSettings} />
