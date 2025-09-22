import type { ModuleMetadata } from "@/moduleif/moduleSystem";

export const Metadata: ModuleMetadata = {
    id: 'theme-config',
    version: '1.0.0',
    description: 'Allows to receive the current theme configuration',
    author: 'ModAI Team',
    dependentModules: ["user-settings-service"],
    components: []
}
