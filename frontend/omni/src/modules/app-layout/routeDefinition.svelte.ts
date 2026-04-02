import type { Component } from "svelte";

export const ROUTE_TYPE = "Route";
export const FALLBACK_ROUTE_TYPE = "FallbackRoute";

export interface RouteNavigationDefinition {
    label: string;
    icon: Component;
}

export interface RouteDefinition {
    path: string;
    component: Component;
    navigation?: RouteNavigationDefinition;
}
