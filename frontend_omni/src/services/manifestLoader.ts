export interface ModuleManifestEntry {
    id: string
    name: string
    path: string
    enabled: boolean
}

export interface ModuleManifest {
    version: string
    modules: ModuleManifestEntry[]
}

export class ManifestLoader {
    private manifestCache: ModuleManifest | null = null

    async loadManifest(): Promise<ModuleManifest> {
        if (this.manifestCache) {
            return this.manifestCache
        }

        try {
            const response = await fetch('/modules/manifest.json')
            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.statusText}`)
            }

            const manifest: ModuleManifest = await response.json()
            this.manifestCache = manifest
            return manifest
        } catch (error) {
            console.error('Failed to load module manifest:', error)
            throw new Error('Failed to load module manifest')
        }
    }

    clearCache(): void {
        this.manifestCache = null
    }
}

export const manifestLoader = new ManifestLoader()
