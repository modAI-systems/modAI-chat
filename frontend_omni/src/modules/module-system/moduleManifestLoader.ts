import { useSuspenseQuery } from "@tanstack/react-query";

// Module Manifest Types
export interface ModuleManifestEntry {
    id: string;
    type: string;
    path: string;
    dependencies?: string[];
}

export interface ModuleManifest {
    version: string;
    modules: ModuleManifestEntry[];
}

export function useManifest(manifestPath: string): ModuleManifest {
    const { data, error } = useSuspenseQuery({
        queryKey: ["modulesManifest", manifestPath],
        queryFn: () => fetchManifestAsync(manifestPath),
    });

    if (error) {
        throw new Error(`Error loading module manifest: ${error.message}`);
    }

    if (!data) {
        throw new Error("Module manifest data is undefined");
    }

    return data;
}

// Fetch function that can be used independently
async function fetchManifestAsync(
    manifestPath: string,
): Promise<ModuleManifest> {
    const response = await fetch(manifestPath);
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    return await response.json();
}
