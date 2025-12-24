import { Navigate, type RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";
import { GlobalSettingsPage } from "./SettingsPage";

export function createRouterEntryGlobal(modules: Modules): RouteObject[] {
    const globalSettingsRouterEntries = modules
        .getAll<(modules: Modules) => RouteObject[]>(
            "GlobalSettingsRouterEntry",
        )
        .flatMap((fn) => fn(modules));

    return [
        {
            path: "/settings/global",
            element: <GlobalSettingsPage />,
            children: [
                ...globalSettingsRouterEntries.flat(),
                {
                    path: "*",
                    element: <Navigate to="/settings/global" replace />,
                },
            ],
        },
    ];
}
