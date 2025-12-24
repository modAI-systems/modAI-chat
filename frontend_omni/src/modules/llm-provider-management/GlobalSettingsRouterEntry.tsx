import type { RouteObject } from "react-router-dom";
import type { Modules } from "@/modules/module-system";
import LLMProviderManagementPage from "./LLMProviderManagementPage";

export function createGlobalSettingsRouterEntry(
    _modules: Modules,
): RouteObject[] {
    return [
        {
            path: "llm-providers",
            element: <LLMProviderManagementPage />,
        },
    ];
}
