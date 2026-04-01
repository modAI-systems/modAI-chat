import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ProvidersRoute from "./ProvidersRoute.svelte";

export function create(): RouteDefinition {
    return {
        path: "/providers",
        component: ProvidersRoute,
    };
}
