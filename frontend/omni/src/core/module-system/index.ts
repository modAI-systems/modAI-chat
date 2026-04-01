import { getContext } from "svelte";

export const MODULES_KEY = Symbol("modules");

/**
 * Scoped dependency accessor for a specific module.
 * Only dependencies declared in that module's manifest entry are accessible.
 */
export interface ModuleDependencies {
    /**
     * Get a single module registered under the name.
     * Throws if no module or more than one module of that name is registered.
     */
    getOne<T>(name: string): T;

    /**
     * Get all modules registered under a specific name.
     */
    getAll<T>(name: string): T[];
}

/**
 * Interface for interacting with the module system.
 * Use getModules() to access this from any child component.
 */
export interface Modules {
    getModuleDependencies(path: string): ModuleDependencies;
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
 * Convenience hook — returns the scoped dependencies for the given module path.
 * Equivalent to getModules().getModuleDependencies(path).
 * Pass the same path string used in modules*.json for this module.
 */
export function getModuleDeps(path: string): ModuleDependencies {
    return getModules().getModuleDependencies(path);
}
