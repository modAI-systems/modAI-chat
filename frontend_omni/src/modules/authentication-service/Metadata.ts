import type { ModuleMetadata } from "@/types/module";
import { ContextProvider } from "./ContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'authentication-service',
    version: '1.0.0',
    description: 'Authentication service providing login, signup, and logout functionality',
    author: 'ModAI Team',
    dependentModules: [],
    components: [ContextProvider]
}
