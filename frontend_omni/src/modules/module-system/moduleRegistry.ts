import { moduleRegistry } from "@/modules/moduleRegistry";
import type { ModuleJsonEntry } from "./modulesJson";

export class LoadedModule {
    id: string;
    type: string;
    component: unknown;
    dependencies: string[];

    constructor(
        id: string,
        type: string,
        component: unknown,
        dependencies: string[] = [],
    ) {
        this.id = id;
        this.type = type;
        this.component = component;
        this.dependencies = dependencies;
    }
}

/**
 * ModuleRegistry is responsible for registering all modules
 * without considering dependencies. It provides just a list of
 * all registered modules.
 */
export class ModuleRegistry {
    private registeredModules: Map<string, LoadedModule> = new Map();

    constructor(modules: ModuleJsonEntry[]) {
        this.registerAllModules(modules);
    }

    /**
     * Register all modules regardless of dependencies
     */
    private registerAllModules(modules: ModuleJsonEntry[]): void {
        for (const entry of modules) {
            const loadedModule = this.loadModule(entry);
            if (loadedModule) {
                this.registeredModules.set(entry.id, loadedModule);
            }
        }
    }

    /**
     * Get all registered modules
     */
    getAll(): LoadedModule[] {
        return Array.from(this.registeredModules.values());
    }

    protected loadModule(entry: ModuleJsonEntry): LoadedModule | null {
        const component = moduleRegistry[entry.path];

        if (!component) {
            console.warn(`Module ${entry.path} not found in registry`, entry);
            return null;
        }

        return new LoadedModule(
            entry.id,
            entry.type,
            component,
            entry.dependencies || [],
        );
    }
}
