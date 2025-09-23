import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'session',
    version: '1.0.0',
    description: 'Session management module that maintains user session state in the browser',
    author: 'ModAI Team',
    dependentModules: [],
    components: [GlobalContextProvider]
}
