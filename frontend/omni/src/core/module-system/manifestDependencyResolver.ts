import type { ManifestEntry } from "./manifestJson";

function normalizeIds(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
}

function getReferencedModuleIds(entry: ManifestEntry): string[] {
    return Object.entries(entry.dependencies ?? {})
        .filter(([key]) => key.startsWith("module:"))
        .flatMap(([, value]) => normalizeIds(value));
}

function getUnmetModuleDependencies(
    entry: ManifestEntry,
    activatedIds: Set<string>,
): string[] {
    return getReferencedModuleIds(entry).filter((id) => !activatedIds.has(id));
}

function getUnmetFlagDependencies(
    entry: ManifestEntry,
    activeFlags: string[],
): string[] {
    return Object.keys(entry.dependencies ?? {})
        .filter((key) => key.startsWith("flag:"))
        .map((key) => {
            const flagPart = key.substring("flag:".length);
            const isNegated = flagPart.startsWith("!");
            const flagName = isNegated ? flagPart.substring(1) : flagPart;
            return { flagName, isNegated, original: key };
        })
        .filter(({ flagName, isNegated }) =>
            isNegated
                ? activeFlags.includes(flagName)
                : !activeFlags.includes(flagName),
        )
        .map(({ original }) => original);
}

/**
 * Resolves which entries are active based on flag and module dependencies.
 * Returns the active entries in activation order (dependencies before dependants).
 */
export function resolveManifestDependencies(
    entries: ManifestEntry[],
    activeFlags: string[] = [],
): ManifestEntry[] {
    const activatedIds = new Set<string>();
    const result: ManifestEntry[] = [];

    function activate(remaining: ManifestEntry[]): void {
        if (remaining.length === 0) {
            return;
        }

        const stillRemaining: ManifestEntry[] = [];

        for (const entry of remaining) {
            const unmetModules = getUnmetModuleDependencies(
                entry,
                activatedIds,
            );
            const unmetFlags = getUnmetFlagDependencies(entry, activeFlags);

            if (unmetModules.length === 0 && unmetFlags.length === 0) {
                activatedIds.add(entry.id);
                result.push(entry);
            } else {
                stillRemaining.push(entry);
            }
        }

        if (stillRemaining.length === remaining.length) {
            const blocked = stillRemaining.filter(
                (entry) =>
                    getUnmetModuleDependencies(entry, activatedIds).length > 0,
            );
            if (blocked.length > 0) {
                console.warn(
                    "Modules could not be activated due to unmet dependencies:",
                    blocked.map((entry) => ({
                        id: entry.id,
                        unmet: getUnmetModuleDependencies(entry, activatedIds),
                    })),
                );
            }
            return;
        }

        activate(stillRemaining);
    }

    activate(entries);
    return result;
}
