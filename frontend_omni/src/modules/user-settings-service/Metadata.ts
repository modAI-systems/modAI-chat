import type { ModuleMetadata } from "@/types/module";
import { ContextProvider } from "./ContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'user-settings-service',
    version: '1.0.0',
    description: 'Pure service module for user settings management via backend REST API (no UI)',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [ContextProvider]
}