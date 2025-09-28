import type {
    ModuleMetadata,
    ModuleManager,
} from "@/moduleif/moduleSystemService";
import type {
    ModuleManifest,
    ModuleManifestEntry,
} from "./moduleManifestLoader";
import { useSuspenseQuery } from "@tanstack/react-query";

interface MetadataFile {
    Metadata: ModuleMetadata | undefined;
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

export class ManifestModuleManager implements ModuleManager {
    private registeredModules: Map<string, ModuleMetadata> = new Map();
    private activeModules: Map<string, ModuleMetadata> = new Map();

    /**
     * Load modules from manifest and metadata files
     */
    async loadModulesFromManifestAsync(manifest: ModuleManifest) {
        for (const manifestEntry of manifest.modules) {
            const metadata = await this.loadModule(manifestEntry);

            if (metadata) {
                this.registeredModules.set(metadata.id, metadata);
                this.activeModules.set(metadata.id, metadata);
            }
        }
    }

    /**
     * Load a single module from manifest entry
     */
    private async loadModule(
        manifestEntry: ModuleManifestEntry
    ): Promise<ModuleMetadata | null> {
        if (!manifestEntry.enabled) {
            console.log(`Module ${manifestEntry.id} is disabled, skipping.`);
            return null;
        }

        // Load the metadata file directly from the path provided in manifest
        const metadataFile = await this.importModule(manifestEntry.path);

        if (!metadataFile || !metadataFile.Metadata) {
            console.warn(
                `Module ${manifestEntry.id} does not have valid metadata`,
                metadataFile
            );
            return null;
        }

        // Add path to metadata
        const metadata: ModuleMetadata = metadataFile.Metadata;

        if (Object.keys(metadata.exports).length === 0) {
            console.warn(
                `Module ${manifestEntry.id} has no components defined in metadata. skipping.`
            );
            return null;
        }

        return metadata;
    }

    /**
     * Dynamic import of a module
     */
    private async importModule(path: string): Promise<MetadataFile | null> {
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
