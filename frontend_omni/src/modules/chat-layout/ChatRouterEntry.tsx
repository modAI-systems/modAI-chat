import { Route } from "react-router-dom";
import { ModuleContextProvider } from "@/modules/module-context-provider/ModuleContextProvider";
import { ChatLayout } from "./ChatLayout";

export default function ChatRouterEntry() {
    return (
        <Route
            key="chat-layout"
            path="/chat"
            element={
                <ModuleContextProvider name="ChatContextProvider">
                    <ChatLayout />
                </ModuleContextProvider>
            }
        />
    );
}
