import type { Routes } from "../router/index.svelte";
import AudioRoute from "./AudioRoute.svelte";

export const AUDIO_PATH = "/settings/audio";

export function create(): Routes {
    return {
        "/settings": {
            "/audio": AudioRoute,
        },
    };
}
