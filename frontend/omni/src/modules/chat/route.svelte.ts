import type { RouteDefinition } from "@/core/main/routeDefinition.svelte.ts";
import ChatRoute from "./ChatRoute.svelte";

export default {
    path: "/chat",
    component: ChatRoute,
    isDefault: true,
} satisfies RouteDefinition;
