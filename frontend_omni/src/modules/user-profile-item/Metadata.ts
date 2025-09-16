import type { ModuleMetadata } from "@/types/module";
import { SidebarFooterItem } from "./SidebarFooterItem";

export const Metadata: ModuleMetadata = {
    id: 'user-profile',
    version: '1.0.0',
    description: 'User profile management module',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem]
}
