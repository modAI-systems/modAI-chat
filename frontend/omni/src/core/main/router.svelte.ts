import { createRouter } from "sv-router";
import type { Component } from "svelte";

let navigateFn: (path: string) => void;
let homePath = "/";

export function initRouter(routes: Record<string, Component>) {
    const router = createRouter(routes);
    navigateFn = router.navigate as unknown as (path: string) => void;
}

export function navigate(path: string) {
    navigateFn(path);
}

export function setHomePath(path: string) {
    homePath = path;
}

export function navigateHome() {
    navigate(homePath);
}
