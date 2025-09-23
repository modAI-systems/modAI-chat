import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'authentication-service',
    version: '1.0.0',
    description: 'Authentication service providing login, signup, and logout functionality',
    author: 'ModAI Team',
    dependentModules: [],
    components: [GlobalContextProvider]
}
