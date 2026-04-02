import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ChatRoute from "./ChatRoute.svelte";

export const CHAT_PATH = "/chat";

export function create(): RouteDefinition {
    return {
        path: CHAT_PATH,
        component: ChatRoute,
    };
}
