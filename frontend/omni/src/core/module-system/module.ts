import type { ComponentResolver } from "./componentResolver";
import type { ModuleDependencies, Modules } from "./index";
import type { ManifestEntry } from "./manifestJson";

function normalizeIds(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
}

export class ModuleDependenciesImpl implements ModuleDependencies {
    constructor(
        private readonly entry: ManifestEntry,
        private readonly allModules: Map<ManifestEntry, ModuleDependencies>,
        private readonly componentResolver: ComponentResolver,
    ) {}

    getOne<T>(name: string): T {
        const refs = this.getReferencedEntries(name);
        if (refs.length !== 1) {
            throw new Error(
                `Expected exactly 1 module for dependency "${name}", found ${refs.length}`,
            );
        }
        return this.resolveComponent<T>(refs[0]);
    }

    getAll<T>(name: string): T[] {
        return this.getReferencedEntries(name).map((ref) =>
            this.resolveComponent<T>(ref),
        );
    }

    getEntry(): ManifestEntry {
        return this.entry;
    }

    private resolveComponent<T>(targetEntry: ManifestEntry): T {
        const targetDeps = this.allModules.get(targetEntry);
        if (!targetDeps) {
            throw new Error(
                `Module "${targetEntry.id}" not found in active modules`,
            );
        }
        return this.componentResolver.getComponent(
            targetEntry.path,
            targetDeps,
            targetEntry.config ?? {},
        ) as T;
    }

    private getReferencedEntries(name: string): ManifestEntry[] {
        const dependencyKey = `module:${name}`;
        const dependencyValue = this.entry.dependencies?.[dependencyKey];

        if (!dependencyValue) {
            throw new Error(`Dependency "${name}" is not declared`);
        }

        return normalizeIds(dependencyValue).map((id) => {
            const referencedEntry = Array.from(this.allModules.keys()).find(
                (entry) => entry.id === id,
            );
            if (!referencedEntry) {
                throw new Error(`Module "${id}" not found in active modules`);
            }
            return referencedEntry;
        });
    }
}

export class ActiveModulesImpl implements Modules {
    private readonly pathMap: Map<string, ModuleDependencies>;

    constructor(
        activeEntries: ManifestEntry[],
        componentResolver: ComponentResolver,
    ) {
        const allModules = new Map<ManifestEntry, ModuleDependencies>();
        for (const entry of activeEntries) {
            allModules.set(
                entry,
                new ModuleDependenciesImpl(
                    entry,
                    allModules,
                    componentResolver,
                ),
            );
        }
        this.pathMap = new Map(
            activeEntries.map((e) => [
                e.path,
                allModules.get(e) as ModuleDependencies,
            ]),
        );
    }

    getModuleDependencies(path: string): ModuleDependencies {
        const deps = this.pathMap.get(path);
        if (!deps) {
            throw new Error(`No module found for path "${path}"`);
        }
        return deps;
    }
}
