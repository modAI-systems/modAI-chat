import type { Routes } from "../router/index.svelte";
import MainApp from "./MainApp.svelte";

export function create(): Routes {
    return {
        layout: MainApp,
    };
}
