import type { RouteObject } from "react-router-dom";
import { ModuleContextProvider } from "@/modules/module-context-provider/ModuleContextProvider";
import type { Modules } from "@/modules/module-system";
import { ChatLayout } from "./ChatLayout";

export function createChatRouterEntry(_modules: Modules): RouteObject[] {
    return [
        {
            path: "/chat",
            element: (
                <ModuleContextProvider name="ChatContextProvider">
                    <ChatLayout />
                </ModuleContextProvider>
            ),
        },
    ];
}
