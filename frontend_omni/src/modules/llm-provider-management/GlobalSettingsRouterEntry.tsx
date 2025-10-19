import { Route } from "react-router-dom";
import LLMProviderManagementPage from "./LLMProviderManagementPage";

export default function GlobalSettingsRouterEntry() {
    return (
        <Route
            key="llm-provider-management"
            path="llm-providers"
            element={<LLMProviderManagementPage />}
        />
    );
}
