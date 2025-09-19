import { Route } from "react-router-dom";
import { Metadata } from "./Metadata";
import { UserSettingsGeneralPage } from "./UserSettingsGeneralPage";

export function UserSettingsRouterEntry() {
    return <Route
        key={Metadata.id}
        path="general"
        element={<UserSettingsGeneralPage />}
    />;
}
