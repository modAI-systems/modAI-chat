import type { ModuleMetadata } from "@/types/module";
import { SidebarFooterItem } from "./SidebarFooterItem";
import { RouterEntry } from "./RouterEntry";

export const Metadata: ModuleMetadata = {
    id: 'global-settings',
    version: '1.0.0',
    description: 'Global settings management module',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem, RouterEntry]
}

export const title = "Global Settings";
export const path = '/globalsettings';
