import type { ModuleMetadata } from "@/types/module";
import { SidebarFooterItem } from "./SidebarFooterItem";
import { FullPageRoute } from "./FullPageRoute";

export const Metadata: ModuleMetadata = {
    id: 'authentication',
    version: '1.0.0',
    description: 'User authentication pages (login and register) and logout functionality',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem, FullPageRoute]
}
