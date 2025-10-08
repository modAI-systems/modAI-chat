import type { ModuleMetadata } from "@/modules/module-system";
import type {
    ModuleManifest,
    ModuleManifestEntry,
} from "./moduleManifestLoader";
import { useSuspenseQuery } from "@tanstack/react-query";

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
    private registeredModules: Map<string, ModuleMetadata> = new Map();
    private activeModules: Map<string, ModuleMetadata> = new Map();

    /**
     * Load modules from manifest and metadata files
     */
    async loadModulesFromManifestAsync(manifest: ModuleManifest) {
        for (const manifestEntry of manifest.modules) {
            const metadata = await this.loadModule(manifestEntry);

            if (metadata) {
                this.registeredModules.set(manifestEntry.id, metadata);
                this.activeModules.set(manifestEntry.id, metadata);
            }
        }
    }

    activate(moduleId: string): void {
        const metadata = this.registeredModules.get(moduleId);
        if (metadata) {
            this.activeModules.set(moduleId, metadata);
        }
    }

    deactivate(moduleId: string): void {
        this.activeModules.delete(moduleId);
    }

    getActiveModules(): Map<string, ModuleMetadata> {
        return this.activeModules;
    }

    /**
     * Load a single module from manifest entry
     */
    private async loadModule(
        manifestEntry: ModuleManifestEntry
    ): Promise<ModuleMetadata | null> {
        // Check activeWhen conditions (simplified - in real implementation would check feature flags)
        if (manifestEntry.activeWhen && manifestEntry.activeWhen.length > 0) {
            // For now, assume modules are active if no conditions or if sessionActive is not required
            // In a real implementation, this would check against current feature flags
            const hasSessionActive =
                manifestEntry.activeWhen.includes("sessionActive");
            if (hasSessionActive) {
                // Skip modules that require sessionActive for now
                console.log(
                    `Module ${manifestEntry.id} requires sessionActive, skipping.`
                );
                return null;
            }
        }

        // Load the component directly from the path provided in manifest
        const componentModule = await this.importModule(manifestEntry.path);

        if (!componentModule || !componentModule.default) {
            console.warn(
                `Module ${manifestEntry.id} does not have a default export`,
                componentModule
            );
            return null;
        }

        // Create metadata with the component exported under the type as class name
        const metadata: ModuleMetadata = {
            version: "1.0.0",
            description: `Module ${manifestEntry.id} of type ${manifestEntry.type}`,
            author: "ModAI Team",
            dependentClasses: [],
            exports: {
                [manifestEntry.type]: componentModule.default,
            },
        };

        return metadata;
    }

    /**
     * Dynamic import of a module
     */
    private async importModule(path: string): Promise<any> {
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
    private activeModules: Map<string, ModuleMetadata>;

    constructor(activeModules: Map<string, ModuleMetadata>) {
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
        this.activeModules.forEach((metadata) => {
            if (metadata.exports[name]) {
                elements.push(metadata.exports[name] as T);
            }
        });
        return elements;
    }
}
