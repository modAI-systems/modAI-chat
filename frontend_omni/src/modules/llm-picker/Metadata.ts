import type { ModuleMetadata } from "@/types/module";
import { ModelPicker } from "./ModelPicker";

export const Metadata: ModuleMetadata = {
    id: 'llm-picker',
    version: '1.0.0',
    description: 'LLM Model Selection plugin for choosing AI models and providers',
    author: 'ModAI Team',
    dependentModules: [],
    components: [ModelPicker]
}
