import type { ModuleMetadata } from '@/types/module'
import { manifestLoader, type ModuleManifestEntry } from './manifestLoader'

export class ModuleManager {
    private registeredModules: Map<string, ModuleMetadata> = new Map()

    /**
     * Load modules from manifest and metadata files
     */
    async loadFromManifest() {
        try {
            const manifest = await manifestLoader.loadManifest()

            for (const manifestEntry of manifest.modules) {
                try {
                    const metadata = await this.loadModule(manifestEntry)

                    if (metadata) {
                        this.registeredModules.set(metadata.id, metadata)
                    }
                } catch (error) {
                    console.error(`Failed to load module ${manifestEntry.id}:`, error)
                }
            }
        } catch (error) {
            console.error('Failed to load modules from manifest:', error)
            throw error
        }
    }

    /**
     * Load a single module from manifest entry
     */
    private async loadModule(manifestEntry: ModuleManifestEntry): Promise<ModuleMetadata | null> {
        try {
            if (!manifestEntry.enabled) {
                console.log(`Module ${manifestEntry.id} is disabled, skipping.`)
                return null
            }

            // Load the metadata file
            const metadataPath = `${manifestEntry.path}/Metadata.ts`
            const metadataFile = await this.importModule(metadataPath)

            if (!metadataFile || !metadataFile.Metadata) {
                console.warn(`Module ${manifestEntry.id} does not have valid metadata`)
                return null
            }

            // Add path to metadata
            const metadata: ModuleMetadata = metadataFile.Metadata

            if (metadata.components.length === 0) {
                console.warn(`Module ${manifestEntry.id} has no components defined in metadata. skipping.`)
                return null
            }

            return metadata
        } catch (error) {
            throw new Error(`Failed to load module ${manifestEntry.id}: ${error}`)
        }
    }

    /**
     * Dynamic import of a module
     */
    private async importModule(path: string): Promise<any> {
        try {
            const importPath = path.startsWith('../') ? path : `../${path}`
            return await import(/* @vite-ignore */ importPath)
        } catch (error) {
            throw new Error(`Failed to import module from ${path}: ${error}`)
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
