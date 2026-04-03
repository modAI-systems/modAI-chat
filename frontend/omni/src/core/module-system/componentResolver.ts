import type { ModuleDependencies } from "./index";
import type { ManifestEntry } from "./manifestJson";

type ModuleImporter = () => Promise<Record<string, unknown>>;

const globModules = import.meta.glob<Record<string, unknown>>([
    "../../modules/**/*.svelte",
    "../../modules/**/*.svelte.ts",
]);

const defaultPathToImporter: Record<string, ModuleImporter> =
    Object.fromEntries(
        Object.entries(globModules).map(([key, importer]) => [
            key
                .replace("../../modules/", "@/modules/")
                .replace(/\.svelte(\.ts)?$/, ""),
            importer as ModuleImporter,
        ]),
    );

export class ComponentResolver {
    private constructor(
        private readonly pathToExports: Map<string, Record<string, unknown>>,
    ) {}

    /**
     * Pre-fetches the raw module exports (calling importer()) for only the paths
     * that are actually referenced as dependencies. Does not invoke any create()
     * functions.
     */
    static async buildUpCache(
        entries: Iterable<ManifestEntry>,
        pathToImporter: Record<string, ModuleImporter> = defaultPathToImporter,
    ): Promise<ComponentResolver> {
        const entriesList = Array.from(entries);
        const allEntriesById = new Map(entriesList.map((e) => [e.id, e]));

        // Collect which entry IDs are actually referenced as dependencies
        const referencedIds = new Set<string>();
        for (const entry of entriesList) {
            for (const value of Object.values(entry.dependencies ?? {})) {
                const ids = Array.isArray(value) ? value : [value];
                for (const id of ids) {
                    if (id.startsWith("module:")) continue; // Skip non-ID strings
                    referencedIds.add(id);
                }
            }
        }

        // Only collect base paths for entries that are actually referenced
        const basePaths = new Set<string>();
        for (const id of referencedIds) {
            const entry = allEntriesById.get(id);
            if (!entry) continue;

            const isFactory = entry.path.endsWith("/create");
            const basePath = isFactory
                ? entry.path.slice(0, -"/create".length)
                : entry.path;
            if (basePath) basePaths.add(basePath);
        }

        const pathToExports = new Map<string, Record<string, unknown>>();
        await Promise.all(
            Array.from(basePaths).map(async (path) => {
                const importer = pathToImporter[path];
                if (!importer) {
                    console.warn(`Module "${path}" not found in registry`);
                    return;
                }
                pathToExports.set(path, await importer());
            }),
        );

        return new ComponentResolver(pathToExports);
    }

    /**
     * For testing: build a resolver from pre-populated exports.
     */
    static fromExports(
        pathToExports: Record<string, Record<string, unknown>>,
    ): ComponentResolver {
        return new ComponentResolver(new Map(Object.entries(pathToExports)));
    }

    /**
     * Returns the component for the given path.
     * - Regular module: returns the default export.
     * - Service factory (path ends with /create): calls create(deps, config)
     *   fresh on every invocation — no caching of the created instance.
     */
    getComponent(
        path: string,
        deps: ModuleDependencies,
        config: Record<string, unknown> = {},
    ): unknown {
        const isFactory = path.endsWith("/create");
        const importPath = isFactory ? path.slice(0, -"/create".length) : path;
        if (!importPath) return null;

        const exports = this.pathToExports.get(importPath);
        if (!exports) return null;

        if (isFactory) {
            const createFn = exports.create;
            if (typeof createFn !== "function") {
                console.warn(
                    `Module "${path}" ends with "/create" but no "create" export was found`,
                );
                return null;
            }
            return createFn(deps, config);
        }

        return exports.default ?? null;
    }
}
