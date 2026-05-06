import type { Routes } from "../router/index.svelte";
import ProvidersRoute from "./ProvidersRoute.svelte";

export const PROVIDERS_PATH = "/settings/providers";

export function create(): Routes {
    return {
        "/settings": {
            "/providers": ProvidersRoute,
        },
    };
}
