import type { ModuleMetadata } from "@/types/module";
import { ContextProvider } from "./ContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'session',
    version: '1.0.0',
    description: 'Session management module that maintains user session state in the browser',
    author: 'ModAI Team',
    dependentModules: [],
    components: [ContextProvider]
}
