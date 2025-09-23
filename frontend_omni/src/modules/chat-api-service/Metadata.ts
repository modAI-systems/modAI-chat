import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'chat-api-service',
    version: '1.0.0',
    description: 'Chat API service providing communication with backend chat endpoints',
    author: 'ModAI Team',
    dependentModules: [],
    components: [GlobalContextProvider]
}
