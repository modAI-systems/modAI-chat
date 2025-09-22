import { Navigate, Route } from "react-router-dom";
import { Metadata } from "./MetaGlobalSettings";
import { useModules } from "@/moduleif/moduleSystem";
import { UserSettingsPage } from "./SettingsPage";
import { userSettingsPath } from "./MetaUserSettings";

export function RouterEntry() {
    const modules = useModules()
    const userSettingsRouterEntryFunctions = modules.getComponentsByName("UserSettingsRouterEntry")

    return (
        <>
            <Route
                key={`${Metadata.id}-user`}
                path={userSettingsPath}
                element={<UserSettingsPage />}
            >
                {userSettingsRouterEntryFunctions.map((createRoute) => (
                    // Usually elements of the `modules.getComponentsByName(...)` are react components
                    // and should be used as <Component />. However, this doesn't work her for the router
                    // because it needs to return a <Route> element. Therefore we call the function directly.
                    (createRoute as Function)()
                ))}
            </Route>
            <Route path={`${userSettingsPath}/*`} element={<Navigate to={userSettingsPath} replace />} />
        </>
    );
}
