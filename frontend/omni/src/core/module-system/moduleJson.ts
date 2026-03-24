export interface ModuleJson {
    version: string;
    modules: ModuleEntry[];
}

export interface ModuleEntry {
    id: string;
    type: string;
    path: string;
    dependencies?: string[];
}

export async function fetchModuleJson(path: string): Promise<ModuleJson> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch module json: ${response.statusText}`);
    }
    return response.json() as Promise<ModuleJson>;
}
