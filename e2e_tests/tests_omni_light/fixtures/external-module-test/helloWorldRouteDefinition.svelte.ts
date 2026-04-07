import type { Routes } from "../router/index.svelte";
import HelloWorldComponent from "./HelloWorldComponent.svelte";

export const HELLO_WORLD_PATH = "/hello-world";

export function create(): Routes {
    return {
        [HELLO_WORLD_PATH]: HelloWorldComponent,
    };
}
