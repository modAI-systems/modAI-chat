import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ChatRoute from "./ChatRoute.svelte";

export function create(): RouteDefinition {
    return {
        path: "/",
        component: ChatRoute,
    };
}
