import { Navigate, type RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";

export function AuthFallbackRouterEntry(_modules: Modules): RouteObject {
    return {
        path: "*",
        element: <Navigate to="/login" replace />,
    };
}
