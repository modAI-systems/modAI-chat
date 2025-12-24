import { Navigate, type RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";
import { UserSettingsPage } from "./SettingsPage";

export function createRouterEntry(modules: Modules): RouteObject[] {
    const userSettingsRouterEntries = modules
        .getAll<(modules: Modules) => RouteObject[]>("UserSettingsRouterEntry")
        .flatMap((fn) => fn(modules));

    return [
        {
            path: "/settings/user",
            element: <UserSettingsPage />,
            children: [
                ...userSettingsRouterEntries.flat(),
                {
                    path: "*",
                    element: <Navigate to="/settings/user" replace />,
                },
            ],
        },
    ];
}
