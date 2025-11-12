export interface ModulesJson {
    version: string;
    modules: ModuleJsonEntry[];
}

export interface ModuleJsonEntry {
    id: string;
    type: string;
    path: string;
    dependencies?: string[];
}

// Fetch function that can be used independently
export async function fetchModulesJsonAsync(
    path: string,
): Promise<ModulesJson> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch modules json: ${response.statusText}`);
    }
    return await response.json();
}
