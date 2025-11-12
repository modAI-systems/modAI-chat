import { moduleRegistry } from "@/modules/moduleRegistry";
import type { ModuleJsonEntry, ModulesJson } from "./modulesJson";

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

export class ModuleManager {
    private registeredModules: Map<string, LoadedModule> = new Map();
    private activeModules: Map<string, LoadedModule> = new Map();

    constructor(modulesJson: ModulesJson) {
        const allModules = modulesJson.modules;

        // Phase 1: Register all modules regardless of dependencies
        this.registerAllModules(allModules);

        // Phase 2: Activate modules considering dependencies
        this.activateModules(Array.from(this.registeredModules.values()));
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
     * Recursively activate modules based on their dependencies
     */
    private activateModules(remainingModules: LoadedModule[]): void {
        if (remainingModules.length === 0) {
            return;
        }

        const stillRemaining: LoadedModule[] = [];

        for (const module of remainingModules) {
            const moduleDeps = module.dependencies
                .filter((dep) => dep.startsWith("module:"))
                .map((dep) => dep.substring("module:".length));

            // Check if all module dependencies are already active
            const allDepsMet = moduleDeps.every((depId) =>
                this.activeModules.has(depId),
            );

            if (allDepsMet) {
                // Activate this module
                this.activeModules.set(module.id, module);
            } else {
                // Dependencies not met, keep for next iteration
                stillRemaining.push(module);
            }
        }

        // If no progress was made, log problematic modules and stop
        if (stillRemaining.length === remainingModules.length) {
            console.warn(
                "The following modules could not be activated due to unmet dependencies:",
                stillRemaining.map((m) => ({
                    id: m.id,
                    dependencies: m.dependencies,
                    unmetDeps: m.dependencies
                        .filter((dep) => dep.startsWith("module:"))
                        .map((dep) => dep.substring("module:".length))
                        .filter((depId) => !this.activeModules.has(depId)),
                })),
            );
        } else {
            // Continue with remaining modules
            this.activateModules(stillRemaining);
        }
    }

    getActiveModules(): Map<string, LoadedModule> {
        return this.activeModules;
    }

    getRegisteredModules(): Map<string, LoadedModule> {
        return this.registeredModules;
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

export class ModuleRegistry {
    private activeModules: Map<string, LoadedModule>;

    constructor(activeModules: Map<string, LoadedModule>) {
        this.activeModules = activeModules;
    }

    /**
     * Get a single component of a specific name across all modules.
     * If more than one component with the same name exists, returns null.
     */
    getOne<T>(name: string): T | null {
        const elements = this.getAll<T>(name);

        if (elements.length > 1) {
            console.warn(
                `Multiple components found with name ${name}, returning null.`,
            );
            return null;
        }

        return elements.length === 1 ? elements[0] : null;
    }

    getAll<T>(name: string): T[] {
        const elements: T[] = [];
        for (const [, module] of this.activeModules) {
            if (module.type === name) {
                elements.push(module.component as T);
            }
        }
        return elements;
    }
}
