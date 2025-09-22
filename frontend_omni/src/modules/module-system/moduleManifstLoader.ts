import { useSuspenseQuery } from "@tanstack/react-query"

// Module Manifest Types
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


export function fetchManifest(): ModuleManifest {
    const { data, error } = useSuspenseQuery({
        queryKey: ['modulesManifest'],
        queryFn: fetchManifestAsync,
    })

    if (error) {
        throw new Error('Error loading module manifest:', error as Error)
    }

    if (!data) {
        throw new Error('Module manifest data is undefined')
    }

    return data
}

// Fetch function that can be used independently
async function fetchManifestAsync(): Promise<ModuleManifest> {
    const response = await fetch('/modules/manifest.json')
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    return await response.json()
}
