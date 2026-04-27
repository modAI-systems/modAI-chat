import type { Routes } from "../router/index.svelte";
import ChatFallbackRedirectRoute from "./ChatFallbackRedirectRoute.svelte";
import ChatRoute from "./ChatRoute.svelte";

export const CHAT_PATH = "/chat";

export function create(): Routes {
    return {
        [CHAT_PATH]: {
            "/": ChatFallbackRedirectRoute,
            "/:chatId": ChatRoute,
        },
    };
}
