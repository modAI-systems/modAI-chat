import { Route } from "react-router-dom";
import { LLMProviderManagementPage } from "./LLMProviderManagementPage";
import { Metadata } from "./Metadata";

export function GlobalSettingsRouterEntry() {
    return <Route
        key={Metadata.id}
        path="llmproviders"
        element={<LLMProviderManagementPage />}
    />;
}
