import type { ModuleEntry } from "./moduleJson";

// ---------------------------------------------------------------------------
// Auto-discovery — Vite import.meta.glob, lazy mode
// ---------------------------------------------------------------------------

// Scans src/modules/**/*.svelte — every file becomes its own async chunk.
// Module paths follow the pattern "@/modules/<path-without-extension>".
const globModules = import.meta.glob<{ default: unknown }>(
    "../../modules/**/*.svelte",
);

const componentRegistry: Record<string, () => Promise<unknown>> =
    Object.fromEntries(
        Object.entries(globModules).map(([key, factory]) => [
            key.replace("../../modules/", "@/modules/").replace(".svelte", ""),
            () => factory().then((m) => m.default),
        ]),
    );

// ---------------------------------------------------------------------------
// LoadedModule + ModuleRegistry
// ---------------------------------------------------------------------------

export class LoadedModule {
    id: string;
    type: string;
    component: unknown;
    dependencies: string[];

    constructor(
        id: string,
        type: string,
        component: unknown,
        dependencies: string[] = [],
    ) {
        this.id = id;
        this.type = type;
        this.component = component;
        this.dependencies = dependencies;
    }
}

export interface ModuleRegistry {
    getAll(): Promise<LoadedModule[]>;
}

/**
 * Builds a list of LoadedModules from module entries.
 * Each module's JS chunk is fetched lazily via dynamic import.
 */
export class JsonModuleRegistry implements ModuleRegistry {
    private entries: ModuleEntry[];

    constructor(entries: ModuleEntry[]) {
        this.entries = entries;
    }

    async getAll(): Promise<LoadedModule[]> {
        const results = await Promise.all(
            this.entries.map((e) => this.loadModule(e)),
        );
        return results.filter((m): m is LoadedModule => m !== null);
    }

    private async loadModule(entry: ModuleEntry): Promise<LoadedModule | null> {
        const factory = componentRegistry[entry.path];
        if (!factory) {
            console.warn(`Module "${entry.path}" not found in registry`, entry);
            return null;
        }
        const component = await factory();
        return new LoadedModule(
            entry.id,
            entry.type,
            component,
            entry.dependencies ?? [],
        );
    }
}
