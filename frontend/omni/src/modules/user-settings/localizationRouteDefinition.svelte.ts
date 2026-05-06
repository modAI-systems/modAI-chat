import type { Routes } from "../router/index.svelte";
import LocalizationRoute from "./LocalizationRoute.svelte";

export const LOCALIZATION_PATH = "/user-settings/localization";

export function create(): Routes {
    return {
        "/user-settings": {
            "/localization": LocalizationRoute,
        },
    };
}
