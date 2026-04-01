export interface ManifestJson {
    version: string;
    modules: ManifestEntry[];
}

export interface ManifestEntry {
    id: string;
    path: string;
    dependencies?: Record<string, string | string[]>;
    config?: Record<string, unknown>;
}

export async function fetchManifestJson(path: string): Promise<ManifestJson> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    return response.json() as Promise<ManifestJson>;
}
