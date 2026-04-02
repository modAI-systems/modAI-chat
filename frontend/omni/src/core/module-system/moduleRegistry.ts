import type { ManifestEntry } from "./manifestJson";

// ---------------------------------------------------------------------------
// Auto-discovery — Vite import.meta.glob, lazy mode
// ---------------------------------------------------------------------------

// Scans src/modules/**/*.svelte and *.svelte.ts — every file its own async chunk.
// Manifest paths follow the pattern "@/modules/<path-without-extension>".
// https://vite.dev/guide/features#glob-import
const globModules = import.meta.glob<Record<string, unknown>>([
    "../../modules/**/*.svelte",
    "../../modules/**/*.svelte.ts",
]);

const componentRegistry: Record<
    string,
    () => Promise<Record<string, unknown>>
> = Object.fromEntries(
    Object.entries(globModules).map(([key, importer]) => [
        key
            .replace("../../modules/", "@/modules/")
            .replace(/\.svelte(\.ts)?$/, ""),
        importer as () => Promise<Record<string, unknown>>,
    ]),
);

// ---------------------------------------------------------------------------
// LoadedModule + ModuleRegistry
// ---------------------------------------------------------------------------

export class LoadedModule {
    id: string;
    path: string;
    component: unknown;
    dependencySpec: Record<string, string | string[]>;
    config: Record<string, unknown>;

    constructor(
        id: string,
        path: string,
        component: unknown,
        dependencySpec: Record<string, string | string[]> = {},
        config: Record<string, unknown> = {},
    ) {
        this.id = id;
        this.path = path;
        this.component = component;
        this.dependencySpec = dependencySpec;
        this.config = config;
    }
}

export interface ModuleRegistry {
    getAll(): Promise<LoadedModule[]>;
}

/**
 * Builds a list of LoadedModules from manifest entries.
 * Each module's JS chunk is fetched lazily via dynamic import.
 */
export class JsonModuleRegistry implements ModuleRegistry {
    private entries: ManifestEntry[];

    constructor(entries: ManifestEntry[]) {
        this.entries = entries;
    }

    async getAll(): Promise<LoadedModule[]> {
        const results = await Promise.all(
            this.entries.map((e) => this.loadModule(e)),
        );
        return results.filter((m): m is LoadedModule => m !== null);
    }

    private async loadModule(
        entry: ManifestEntry,
    ): Promise<LoadedModule | null> {
        const isFactory = entry.path.endsWith("/create");
        const filePath = isFactory
            ? entry.path.slice(0, -"/create".length)
            : entry.path;

        if (!filePath) {
            return new LoadedModule(
                entry.id,
                filePath,
                null,
                entry.dependencies ?? {},
            );
        }
        const factory = componentRegistry[filePath];
        if (!factory) {
            console.warn(`Module "${filePath}" not found in registry`, entry);
            return null;
        }
        const moduleExports = await factory();

        let component: unknown;
        if (isFactory) {
            const createFn = moduleExports.create;
            if (typeof createFn !== "function") {
                console.warn(
                    `Module "${entry.id}" path ends with "/create" but no "create" export found`,
                    entry,
                );
                return null;
            }
            component = createFn;
        } else {
            component = moduleExports.default;
        }

        return new LoadedModule(
            entry.id,
            entry.path,
            component,
            entry.dependencies ?? {},
            entry.config ?? {},
        );
    }
}
