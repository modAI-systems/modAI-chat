import type { ModuleMetadata } from "@/types/module";
import { GlobalSidebarFooterItem } from "./SidebarFooterItemGlobal";
import { RouterEntry } from "./RouterEntryGlobal";

export const Metadata: ModuleMetadata = {
    id: 'global-settings',
    version: '1.0.0',
    description: 'Global settings management module',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem, RouterEntry]
}

export const globalSettingsPath = '/settings/global';


function SidebarFooterItem() {
    return GlobalSidebarFooterItem();
}
