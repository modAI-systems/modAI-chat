import type { Routes } from "./index.svelte";

export function mergeRouteMaps(routeMaps: Routes[]): Routes {
    const mergedRoutes: Routes = {};

    for (const routeMap of routeMaps) {
        mergeRouteBranch(mergedRoutes, routeMap);
    }

    return mergedRoutes;
}

function mergeRouteBranch(target: Routes, source: Routes): void {
    for (const [key, value] of Object.entries(source)) {
        const existingValue = (target as Record<string, unknown>)[key];

        if (
            isPathKey(key) &&
            isRouteBranch(existingValue) &&
            isRouteBranch(value)
        ) {
            mergeRouteBranch(existingValue, value);
            continue;
        }

        (target as Record<string, unknown>)[key] = value;
    }
}

function isPathKey(key: string): boolean {
    return key.startsWith("/") || key.startsWith("*") || key.startsWith("(*");
}

function isRouteBranch(value: unknown): value is Routes {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
