import { MessageSquare } from "lucide-svelte";
import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ChatRoute from "./ChatRoute.svelte";

export function create(): RouteDefinition {
    return {
        path: "/",
        component: ChatRoute,
        navigation: {
            label: "Chat",
            icon: MessageSquare,
        },
    };
}
