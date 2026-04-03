import type { Routes } from "../router/index.svelte";
import ChatFallbackRedirectRoute from "./ChatFallbackRedirectRoute.svelte";

export function create(): Routes {
    return {
        "*": ChatFallbackRedirectRoute,
    };
}
