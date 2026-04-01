import { createRouter } from "sv-router";
import type { ModuleDependencies } from "@/core/module-system";
import type { RouteDefinition } from "./routeDefinition.svelte";

export type AppRouter = ReturnType<typeof createRouter>;

export function create(deps: ModuleDependencies): AppRouter {
    const routes = deps.getAll<RouteDefinition>("routes");
    const fallbackRoute = deps.getOne<RouteDefinition>("fallbackRoute");
    const routeMap: Record<string, RouteDefinition["component"]> = {};

    for (const routeDef of routes) {
        routeMap[routeDef.path] = routeDef.component;
    }

    routeMap["*"] = fallbackRoute.component;
    const router = createRouter(routeMap);

    if (
        typeof window !== "undefined" &&
        window.location.pathname === "/" &&
        fallbackRoute.path !== "/"
    ) {
        void router.navigate(fallbackRoute.path, { replace: true });
    }

    return router;
}
