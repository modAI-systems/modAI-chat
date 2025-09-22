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
                    createRoute()
                ))}
            </Route>
            <Route path={`${userSettingsPath}/*`} element={<Navigate to={userSettingsPath} replace />} />
        </>
    );
}
