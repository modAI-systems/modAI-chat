import type { Routes } from "../router/index.svelte";
import ToolsRoute from "./ToolsRoute.svelte";

export const TOOLS_PATH = "/tools";

export function create(): Routes {
    return {
        [TOOLS_PATH]: ToolsRoute,
    };
}
