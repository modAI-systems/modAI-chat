import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { UserSettingsRow } from "./UserSettingsRow";

export const Metadata: ModuleMetadata = {
    id: 'theme',
    version: '1.0.0',
    description: 'Theme management service providing light/dark theme functionality',
    author: 'ModAI Team',
    dependentModules: [],
    components: [UserSettingsRow]
}
