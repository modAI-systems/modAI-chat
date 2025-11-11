import { useSuspenseQuery } from "@tanstack/react-query";

export interface ModuleJsonEntry {
    id: string;
    type: string;
    path: string;
    dependencies?: string[];
}

export interface ModulesJson {
    version: string;
    modules: ModuleJsonEntry[];
}

export function useModulesJson(path: string): ModulesJson {
    const { data, error } = useSuspenseQuery({
        queryKey: ["modulesJson", path],
        queryFn: () => fetchModulesJsonAsync(path),
    });

    if (error) {
        throw new Error(`Error loading module modules json: ${error.message}`);
    }

    if (!data) {
        throw new Error("Module json data is undefined");
    }

    return data;
}

// Fetch function that can be used independently
async function fetchModulesJsonAsync(path: string): Promise<ModulesJson> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch modules json: ${response.statusText}`);
    }
    return await response.json();
}
