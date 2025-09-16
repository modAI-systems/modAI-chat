import type { ModuleMetadata } from "@/types/module";
import { SidebarItem } from "./ModuleMenuItems";
import { RouterEntry } from "./ModuleRouting";

export const Metadata: ModuleMetadata = {
    id: 'chat',
    version: '1.0.0',
    description: 'AI Chat interface with configurable providers and models',
    author: 'ModAI Team',
    dependentModules: ["session", "llm-picker", "llm-provider-service"],
    components: [SidebarItem, RouterEntry]
}

export const title = "New Chat";
export const path = '/chat';
