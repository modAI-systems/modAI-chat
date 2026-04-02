import type { Component } from "svelte";

export const ROUTE_TYPE = "Route";
export const FALLBACK_ROUTE_TYPE = "FallbackRoute";

export interface RouteDefinition {
    path: string;
    component: Component;
}
