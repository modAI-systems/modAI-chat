import type { Component } from "svelte";

/**
 * Descriptor for a route registered via the module system.
 * Modules export a default object satisfying this interface with type "AppRoute".
 */
export interface RouteDefinition {
    /** URL path that activates this route, e.g. "/chat" */
    path: string;
    /** Svelte component rendered when this route is active */
    component: Component;
}

export const ROUTE_TYPE = "AppRoute";
export const FALLBACK_ROUTE_TYPE = "FallbackRoute";
