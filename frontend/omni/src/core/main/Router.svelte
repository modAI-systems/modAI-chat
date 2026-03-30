<script lang="ts">
import { Router } from "sv-router";
import type { Component } from "svelte";
import { getModules } from "../module-system/index";
import {
    FALLBACK_ROUTE_TYPE,
    ROUTE_TYPE,
    type RouteDefinition,
} from "./routeDefinition.svelte.ts";
import { initRouter, navigate, setHomePath } from "./router.svelte.ts";

const modules = getModules();
const routes = modules.getAll<RouteDefinition>(ROUTE_TYPE);
const fallbackRoute = modules.getOne<RouteDefinition>(FALLBACK_ROUTE_TYPE);

const routeMap: Record<string, Component> = {};
for (const r of routes) {
    routeMap[r.path] = r.component;
}
if (fallbackRoute) {
    routeMap["*"] = fallbackRoute.component;
    setHomePath(fallbackRoute.path);
}

initRouter(routeMap);

if (fallbackRoute && window.location.pathname === "/") {
    navigate(fallbackRoute.path);
}
</script>

<Router />
