import { getContext } from "svelte";
import type { LoadedModule } from "./moduleRegistry";

export const MODULES_KEY = Symbol("modules");

/**
 * Interface for interacting with the module system.
 * Use getModules() to access this from any child component.
 */
export interface Modules {
    /**
     * Get a single module of a specific type.
     * Returns null if none or more than one module of that type is found.
     */
    getOne<T>(type: string): T | null;

    /**
     * Get all modules registered under a specific type.
     */
    getAll<T>(type: string): T[];
}

/**
 * Hook to access the module system from any component inside ModulesProvider.
 */
export function getModules(): Modules {
    const modules = getContext<Modules>(MODULES_KEY);
    if (!modules) {
        throw new Error("getModules must be called inside a ModulesProvider");
    }
    return modules;
}

/**
 * Active module registry — implements the Modules interface over a resolved list.
 */
export class ActiveModulesImpl implements Modules {
    private moduleMap: Map<string, LoadedModule>;

    constructor(modules: LoadedModule[]) {
        this.moduleMap = new Map(modules.map((m) => [m.id, m]));
    }

    getOne<T>(type: string): T | null {
        const found = this.getAll<T>(type);
        if (found.length > 1) {
            console.warn(
                `Multiple modules found with type "${type}", returning null.`,
            );
            return null;
        }
        return found.length === 1 ? found[0] : null;
    }

    getAll<T>(type: string): T[] {
        return Array.from(this.moduleMap.values())
            .filter((m) => m.type === type)
            .map((m) => m.component as T);
    }
}
