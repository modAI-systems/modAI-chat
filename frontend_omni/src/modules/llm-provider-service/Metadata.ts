import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalContextProvider } from "./GlobalContextProvider";

export const Metadata: ModuleMetadata = {
    id: 'llm-provider-service',
    version: '1.0.0',
    description: 'Core service module for LLM provider management and REST API interactions',
    author: 'ModAI Team',
    dependentModules: [],
    components: [GlobalContextProvider]
}
