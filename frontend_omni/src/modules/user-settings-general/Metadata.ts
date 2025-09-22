import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { UserSettingsNavItem } from "./UserSettingsNavItem";
import { UserSettingsRouterEntry } from "./UserSettingsRouterEntry";

export const Metadata: ModuleMetadata = {
    id: 'user-settings-general',
    version: '1.0.0',
    description: 'User general settings module for managing personal preferences and account settings',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [UserSettingsNavItem, UserSettingsRouterEntry]
}
