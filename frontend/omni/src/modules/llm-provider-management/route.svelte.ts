import type { RouteDefinition } from "@/core/main/routeDefinition.svelte.ts";
import ProvidersRoute from "./ProvidersRoute.svelte";

export default {
    path: "/providers",
    component: ProvidersRoute,
} satisfies RouteDefinition;
