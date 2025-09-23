import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'user-settings-service',
    version: '1.0.0',
    description: 'Pure service module for user settings management via backend REST API (no UI)',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [GlobalContextProvider]
}
