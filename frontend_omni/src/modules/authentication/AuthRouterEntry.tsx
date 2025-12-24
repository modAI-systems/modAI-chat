import type { RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";
import { LoginPage } from "./LoginPage";
import RegisterPage from "./RegisterPage";

export function createAuthRouterEntry(_modules: Modules): RouteObject[] {
    return [
        {
            path: "/login",
            element: <LoginPage />,
        },
        {
            path: "/register",
            element: <RegisterPage />,
        },
    ];
}
