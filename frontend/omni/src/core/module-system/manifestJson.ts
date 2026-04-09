export type CollisionStrategy = "merge" | "replace" | "drop";

export interface IncludeEntry {
    path: string;
}

export interface ManifestJson {
    version: string;
    /** Only allowed in the root manifest. Nested includes are not supported. */
    includes?: IncludeEntry[];
    modules: ManifestEntry[];
}

export interface ManifestEntry {
    id: string;
    path: string;
    dependencies?: Record<string, string | string[]>;
    config?: Record<string, unknown>;
    /**
     * Controls how this entry behaves when its `id` already exists from an
     * included file. Only meaningful on root-manifest entries (or later
     * includes that overwrite earlier ones).
     *
     * - `merge` (default): deep-merge config; incoming wins on shared keys.
     *   For dependency keys whose values are arrays in both base and incoming,
     *   the arrays are unioned (base items first, then new incoming items;
     *   duplicates are dropped). For string dependency values, incoming wins.
     * - `replace`: incoming entry fully replaces the existing one.
     * - `drop`: remove the existing entry; do not add this entry either.
     *
     * Stripped from the final resolved manifest.
     */
    collisionStrategy?: CollisionStrategy;
}

/**
 * Fetch and resolve a manifest, expanding any `includes` into a single merged
 * module list. Only the root manifest may contain `includes`; nested includes
 * throw an error.
 *
 * Load order (mirrors the backend YAML config loader):
 *  1. Includes are applied left-to-right; later includes win on collision.
 *  2. Root modules are applied last and always win.
 */
export async function resolveManifest(path: string): Promise<ManifestJson> {
    const root = await fetchManifestJson(path);
    const includes = root.includes ?? [];

    if (includes.length === 0) {
        return { version: root.version, modules: root.modules };
    }

    let accumulated = new Map<string, ManifestEntry>();

    for (const include of includes) {
        const includePath = resolveIncludePath(path, include.path);
        const included = await fetchManifestJson(includePath);
        if (included.includes && included.includes.length > 0) {
            throw new Error(
                `Nested includes are not supported. '${includePath}' contains an 'includes' key. ` +
                    "Only the root manifest may use 'includes'.",
            );
        }
        accumulated = applyModules(accumulated, included.modules);
    }

    accumulated = applyModules(accumulated, root.modules);

    const resolvedModules: ManifestEntry[] = Array.from(
        accumulated.values(),
    ).map(({ collisionStrategy: _, ...rest }) => rest as ManifestEntry);

    return { version: root.version, modules: resolvedModules };
}

export async function fetchManifestJson(path: string): Promise<ManifestJson> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    return response.json() as Promise<ManifestJson>;
}

function resolveIncludePath(manifestPath: string, includePath: string): string {
    if (includePath.startsWith("/")) return includePath;
    const lastSlash = manifestPath.lastIndexOf("/");
    const base = lastSlash >= 0 ? manifestPath.substring(0, lastSlash + 1) : "";
    return base + includePath;
}

function applyModules(
    base: Map<string, ManifestEntry>,
    incoming: ManifestEntry[],
): Map<string, ManifestEntry> {
    const result = new Map(base);

    for (const entry of incoming) {
        const strategy = entry.collisionStrategy ?? "merge";

        if (strategy === "drop") {
            result.delete(entry.id);
            continue;
        }

        if (!result.has(entry.id)) {
            result.set(entry.id, entry);
            continue;
        }

        if (strategy === "replace") {
            result.set(entry.id, entry);
        } else {
            const existing = result.get(entry.id);
            if (existing) {
                result.set(entry.id, deepMergeEntries(existing, entry));
            }
        }
    }

    return result;
}

function mergeDependencies(
    base: Record<string, string | string[]>,
    incoming: Record<string, string | string[]>,
): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = { ...base };
    for (const [key, val] of Object.entries(incoming)) {
        const existing = result[key];
        if (Array.isArray(val) && Array.isArray(existing)) {
            const seen = new Set(existing);
            result[key] = [...existing, ...val.filter((v) => !seen.has(v))];
        } else {
            result[key] = val;
        }
    }
    return result;
}

function deepMergeEntries(
    base: ManifestEntry,
    incoming: ManifestEntry,
): ManifestEntry {
    const merged: ManifestEntry = { ...base, ...incoming };

    if (
        base.dependencies !== undefined ||
        incoming.dependencies !== undefined
    ) {
        merged.dependencies = mergeDependencies(
            base.dependencies ?? {},
            incoming.dependencies ?? {},
        );
    }

    if (base.config !== undefined || incoming.config !== undefined) {
        merged.config = deepMergeRecords(
            base.config ?? {},
            incoming.config ?? {},
        );
    }

    return merged;
}

function deepMergeRecords(
    base: Record<string, unknown>,
    incoming: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...base };
    for (const [key, val] of Object.entries(incoming)) {
        if (
            val !== null &&
            typeof val === "object" &&
            !Array.isArray(val) &&
            key in result &&
            result[key] !== null &&
            typeof result[key] === "object" &&
            !Array.isArray(result[key])
        ) {
            result[key] = deepMergeRecords(
                result[key] as Record<string, unknown>,
                val as Record<string, unknown>,
            );
        } else {
            result[key] = val;
        }
    }
    return result;
}
