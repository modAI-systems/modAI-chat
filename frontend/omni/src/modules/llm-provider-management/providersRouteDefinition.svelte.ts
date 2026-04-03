import type { Routes } from "../router/index.svelte";
import ProvidersRoute from "./ProvidersRoute.svelte";

export const PROVIDERS_PATH = "/providers";

export function create(): Routes {
    return {
        [PROVIDERS_PATH]: ProvidersRoute,
    };
}
