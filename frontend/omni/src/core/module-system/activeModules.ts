import type { ModuleDependencies, Modules } from "./index";
import type { LoadedModule } from "./moduleRegistry";

/**
 * Implements ModuleDependencies by resolving declared dependency names
 * against the activated module map.
 */
export class ModuleDependenciesImpl implements ModuleDependencies {
    private moduleDeps: Record<string, string | string[]>;
    private idMap: Map<string, LoadedModule>;

    constructor(
        moduleDeps: Record<string, string | string[]>,
        idMap: Map<string, LoadedModule>,
    ) {
        this.moduleDeps = moduleDeps;
        this.idMap = idMap;
    }

    getOne<T>(name: string): T {
        const key = `module:${name}`;
        if (!(key in this.moduleDeps)) {
            throw new Error(`Dependency "${name}" is not declared`);
        }
        const value = this.moduleDeps[key];
        const ids = Array.isArray(value) ? value : [value];
        if (ids.length !== 1) {
            throw new Error(
                `Expected exactly 1 module for dependency "${name}", found ${ids.length}`,
            );
        }
        return this.resolveModule<T>(ids[0]);
    }

    getAll<T>(name: string): T[] {
        const key = `module:${name}`;
        if (!(key in this.moduleDeps)) {
            throw new Error(`Dependency "${name}" is not declared`);
        }
        const value = this.moduleDeps[key];
        const ids = Array.isArray(value) ? value : [value];
        return ids.map((id) => this.resolveModule<T>(id));
    }

    private resolveModule<T>(id: string): T {
        const mod = this.idMap.get(id);
        if (!mod) {
            throw new Error(`Module "${id}" not found in active modules`);
        }
        return mod.component as T;
    }
}

/**
 * Active module registry — implements the Modules interface over a resolved list.
 */
export class ActiveModulesImpl implements Modules {
    /** Keyed by module ID — used internally for dependency resolution. */
    private idMap: Map<string, LoadedModule>;
    /** Keyed by module path — used for public getModuleDependencies(path) lookup. */
    private pathMap: Map<string, LoadedModule>;

    constructor(modules: LoadedModule[]) {
        this.idMap = new Map(modules.map((m) => [m.id, m]));
        this.pathMap = new Map(modules.map((m) => [m.path, m]));
    }

    getModuleDependencies(path: string): ModuleDependencies {
        const mod = this.pathMap.get(path);
        if (!mod) {
            throw new Error(`No module found for path "${path}"`);
        }
        return new ModuleDependenciesImpl(mod.dependencySpec, this.idMap);
    }
}
