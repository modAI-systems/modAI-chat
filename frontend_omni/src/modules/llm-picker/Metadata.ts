import type { ModuleMetadata } from "@/types/module";
import { GlobalSettingsNavItem } from "./ModuleMenuItems";
import { GlobalSettingsRouterEntry } from "./ModuleRouting";

export const Metadata: ModuleMetadata = {
    id: 'llm-picker',
    version: '1.0.0',
    description: 'LLM Provider Management plugin for configuring AI model providers and models',
    author: 'ModAI Team',
    dependentModules: ["session", "llm-provider-service"],
    components: [GlobalSettingsNavItem, GlobalSettingsRouterEntry]
}
