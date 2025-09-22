import type { ModuleMetadata } from "@/moduleif/moduleSystem";
import { GlobalSettingsNavItem } from "./GlobalSettingsNavItem";
import { GlobalSettingsRouterEntry } from "./GlobalSettingsRouterEntry";

export const Metadata: ModuleMetadata = {
    id: 'llm-provider-management',
    version: '1.0.0',
    description: 'LLM Provider Management module for configuring and managing AI model providers',
    author: 'ModAI Team',
    dependentModules: ["session", "llm-provider-service"],
    components: [GlobalSettingsNavItem, GlobalSettingsRouterEntry]
}
