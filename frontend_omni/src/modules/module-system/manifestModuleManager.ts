import type {
    ModuleManifest,
    ModuleManifestEntry,
} from "./moduleManifestLoader";
import { useSuspenseQuery } from "@tanstack/react-query";

export class LoadedModule {
    id: string;
    type: string;
    component: unknown;
    neededModules: string[];

    constructor(
        id: string,
        type: string,
        component: unknown,
        neededModules: string[] = []
    ) {
        this.id = id;
        this.type = type;
        this.component = component;
        this.neededModules = neededModules;
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
            const loadedModule = await this.loadModule(manifestEntry);
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
            const neededModules = module.neededModules;

            // Check if all dependencies are already active
            const allDepsMet = neededModules.every((depId) =>
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
                    neededModules: m.neededModules,
                    unmetDeps: m.neededModules.filter(
                        (depId) => !this.activeModules.has(depId)
                    ),
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
    protected async loadModule(
        manifestEntry: ModuleManifestEntry
    ): Promise<LoadedModule | null> {
        const componentModule = await this.importModule(manifestEntry.path);

        if (!componentModule) {
            return null;
        }

        if (!componentModule.default) {
            console.warn(
                `Module ${manifestEntry.id} does not have a default export`,
                manifestEntry
            );
            return null;
        }

        return new LoadedModule(
            manifestEntry.id,
            manifestEntry.type,
            componentModule.default,
            manifestEntry.neededModules || []
        );
    }

    /**
     * Dynamic import of a module
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async importModule(path: string): Promise<any> {
        try {
            const importPath = path.startsWith("@/")
                ? path.replace("@/", "../../")
                : path;
            return await import(/* @vite-ignore */ importPath);
        } catch (error) {
            console.warn(`Failed to import module from ${path}: ${error}`);
            return null;
        }
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
