import type { RouteDefinition } from "@/modules/app-layout/routeDefinition.svelte";
import ProvidersRoute from "./ProvidersRoute.svelte";

export const PROVIDERS_PATH = "/providers";

export function create(): RouteDefinition {
    return {
        path: PROVIDERS_PATH,
        component: ProvidersRoute,
    };
}
