import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'user-service',
    version: '1.0.0',
    description: 'User management module providing user data and related services',
    author: 'ModAI Team',
    dependentModules: [],
    components: [GlobalContextProvider]
};
