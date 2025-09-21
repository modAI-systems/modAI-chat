import type { ModuleMetadata } from "@/types/module";
import { BackgroundComponent } from "./ThemeByConfigUpdater";

export const Metadata: ModuleMetadata = {
    id: 'theme-config',
    version: '1.0.0',
    description: 'Allows to receive the current theme configuration',
    author: 'ModAI Team',
    dependentModules: ["user-settings-service"],
    components: [BackgroundComponent]
}
