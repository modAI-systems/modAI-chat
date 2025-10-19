import type {
    ModuleManifest,
    ModuleManifestEntry,
} from "./moduleManifestLoader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { moduleRegistry } from "@/modules/moduleRegistry";

export class LoadedModule {
    id: string;
    type: string;
    component: unknown;
    dependencies: string[];

    constructor(
        id: string,
        type: string,
        component: unknown,
        dependencies: string[] = []
    ) {
        this.id = id;
        this.type = type;
        this.component = component;
        this.dependencies = dependencies;
    }
}

export function useModuleManagerFromManifest(
    manifest: ModuleManifest
): ManifestModuleManager {
    async function newModuleManagerAsync(): Promise<ManifestModuleManager> {
        const moduleManager = new ManifestModuleManager();
        await moduleManager.loadModulesFromManifestAsync(manifest);
        return moduleManager;
    }

    const { data: manager, error } = useSuspenseQuery({
        queryKey: ["moduleManager"],
        queryFn: newModuleManagerAsync,
    });

    if (error) {
        throw new Error("Error loading module manager:", error as Error);
    }

    if (!manager) {
        throw new Error("Module manager is undefined");
    }

    return manager;
}

export class ManifestModuleManager {
    private registeredModules: Map<string, LoadedModule> = new Map();
    private activeModules: Map<string, LoadedModule> = new Map();

    /**
     * Load modules from manifest
     */
    async loadModulesFromManifestAsync(manifest: ModuleManifest) {
        const allModules = manifest.modules;

        // Phase 1: Register all modules regardless of dependencies
        await this.registerAllModules(allModules);

        // Phase 2: Activate modules considering dependencies
        await this.activateModules(Array.from(this.registeredModules.values()));
    }

    /**
     * Register all modules regardless of dependencies
     */
    private async registerAllModules(
        modules: ModuleManifestEntry[]
    ): Promise<void> {
        for (const manifestEntry of modules) {
            const loadedModule = this.loadModule(manifestEntry);
            if (loadedModule) {
                this.registeredModules.set(manifestEntry.id, loadedModule);
            }
        }
    }

    /**
     * Recursively activate modules based on their dependencies
     */
    private async activateModules(
        remainingModules: LoadedModule[]
    ): Promise<void> {
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
                this.activeModules.has(depId)
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
                }))
            );
        } else {
            // Continue with remaining modules
            await this.activateModules(stillRemaining);
        }
    }

    getActiveModules(): Map<string, LoadedModule> {
        return this.activeModules;
    }

    getRegisteredModules(): Map<string, LoadedModule> {
        return this.registeredModules;
    }

    /**
     * Load a single module from manifest entry
     */
    protected loadModule(
        manifestEntry: ModuleManifestEntry
    ): LoadedModule | null {
        const component = moduleRegistry[manifestEntry.path];

        if (!component) {
            console.warn(
                `Module ${manifestEntry.path} not found in registry`,
                manifestEntry
            );
            return null;
        }

        return new LoadedModule(
            manifestEntry.id,
            manifestEntry.type,
            component,
            manifestEntry.dependencies || []
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
                `Multiple components found with name ${name}, returning null.`
            );
            return null;
        }

        return elements.length === 1 ? elements[0] : null;
    }

    getAll<T>(name: string): T[] {
        const elements: T[] = [];
        this.activeModules.forEach((module) => {
            if (module.type === name) {
                elements.push(module.component as T);
            }
        });
        return elements;
    }
}
