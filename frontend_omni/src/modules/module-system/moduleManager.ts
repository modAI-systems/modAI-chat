import type { ModuleMetadata, ModuleManager as IModuleManager } from '@/moduleif/moduleSystem'
import type { ModuleManifest, ModuleManifestEntry } from './moduleManifstLoader'
import { useSuspenseQuery } from '@tanstack/react-query'


export function newModuleManagerFromManifest(manifest: ModuleManifest): ModuleManager {
    async function newModuleManagerAsync(): Promise<ModuleManager> {
        const moduleManager = new ModuleManager()
        await moduleManager.loadModulesFromManifestAsync(manifest)
        return moduleManager
    }

    const { data: manager, error } = useSuspenseQuery({
        queryKey: ['moduleManager'],
        queryFn: newModuleManagerAsync,
    })

    if (error) {
        throw new Error('Error loading module manager:', error as Error)
    }

    if (!manager) {
        throw new Error('Module manager is undefined')
    }

    return manager
}


export class ModuleManager implements IModuleManager {
    private registeredModules: Map<string, ModuleMetadata> = new Map()

    /**
     * Load modules from manifest and metadata files
     */
    async loadModulesFromManifestAsync(manifest: ModuleManifest) {
        for (const manifestEntry of manifest.modules) {
            const metadata = await this.loadModule(manifestEntry)

            if (metadata) {
                this.registeredModules.set(metadata.id, metadata)
            }
        }
    }

    /**
     * Load a single module from manifest entry
     */
    private async loadModule(manifestEntry: ModuleManifestEntry): Promise<ModuleMetadata | null> {
        if (!manifestEntry.enabled) {
            console.log(`Module ${manifestEntry.id} is disabled, skipping.`)
            return null
        }

        // Load the metadata file directly from the path provided in manifest
        const metadataFile = await this.importModule(manifestEntry.path)

        if (!metadataFile || !metadataFile.Metadata) {
            console.warn(`Module ${manifestEntry.id} does not have valid metadata`, metadataFile)
            return null
        }

        // Add path to metadata
        const metadata: ModuleMetadata = metadataFile.Metadata

        if (metadata.components.length === 0) {
            console.warn(`Module ${manifestEntry.id} has no components defined in metadata. skipping.`)
            return null
        }

        return metadata
    }

    /**
     * Dynamic import of a module
     */
    private async importModule(path: string): Promise<any> {
        try {
            const importPath = path.startsWith('@/') ? path.replace('@/', '../../') : path
            return await import(/* @vite-ignore */ importPath)
        } catch (error) {
            console.warn(`Failed to import module from ${path}: ${error}`)
            return null
        }
    }

    /**
     * Get all loaded module metadata
     */
    getModules(): ModuleMetadata[] {
        return Array.from(this.registeredModules.values())
    }

    /**
     * Get a module metadata by ID
     */
    getModuleById(id: string): ModuleMetadata | null {
        return this.registeredModules.get(id) || null
    }

    /**
     * Check if a module has a specific component
     */
    has(moduleId: string, componentName: string): boolean {
        const metadata = this.registeredModules.get(moduleId)
        if (!metadata) { return false }
        return metadata.components.find(c => c.name === componentName) !== undefined
    }

    /**
     * Get a specific component from a specific module
     */
    get<T = React.ComponentType<any>>(moduleId: string, componentName: string): T | null {
        const metadata = this.registeredModules.get(moduleId)
        if (!metadata) { return null }

        return metadata.components.find(c => c.name === componentName) as T || null
    }

    /**
     * Get all components of a specific name across all modules
     */
    getComponentsByName<T = React.ComponentType<any>>(componentName: string): T[] {
        const components: T[] = []
        this.registeredModules.forEach(metadata => {
            metadata.components
                .filter(c => c.name === componentName)
                .forEach(c => components.push(c as T))
        })
        return components
    }
}
