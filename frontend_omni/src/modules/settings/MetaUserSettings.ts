import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { RouterEntry } from "./RouterEntryUser";
import { UserSidebarFooterItem } from "./SidebarFooterItemUser";

export const Metadata: ModuleMetadata = {
    id: 'user-settings',
    version: '1.0.0',
    description: 'User settings management module',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem, RouterEntry]
}

export const userSettingsPath = '/settings/user';

function SidebarFooterItem() {
    return UserSidebarFooterItem();
}
