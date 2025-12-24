import { Navigate, type RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";

export function ChatFallbackRouterEntry(_modules: Modules): RouteObject {
    return {
        path: "*",
        element: <Navigate to="/chat" replace />,
    };
}
