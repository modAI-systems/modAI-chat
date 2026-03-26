import type { RouteDefinition } from "@/core/main/routeDefinition.svelte.ts";
import ToolsRoute from "./ToolsRoute.svelte";

export default {
    path: "/tools",
    component: ToolsRoute,
} satisfies RouteDefinition;
