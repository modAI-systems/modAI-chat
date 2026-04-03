import type { RouterApi, Routes } from "sv-router";
import { getContext } from "svelte";

export type { Routes } from "sv-router";

export function getRouterApi(): RouterApi<Routes> {
    return getContext<() => RouterApi<Routes>>(Symbol.for("modai.router"))();
}
