import { Settings2 } from "lucide-svelte";
import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ProvidersRoute from "./ProvidersRoute.svelte";

export function create(): RouteDefinition {
    return {
        path: "/providers",
        component: ProvidersRoute,
        navigation: {
            label: "Providers",
            icon: Settings2,
        },
    };
}
