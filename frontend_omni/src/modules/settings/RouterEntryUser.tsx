import { Navigate, Route } from "react-router-dom";
import { UserSettingsPage } from "./SettingsPage";
import { useModules } from "@/modules/module-system";

export function RouterEntry() {
    const modules = useModules();
    const userSettingsRouterEntryFunctions = modules.getAll<
        () => React.ReactElement
    >("UserSettingsRouterEntry");

    return (
        <>
            <Route
                key={`user-settings`}
                path={`/settings/user`}
                element={<UserSettingsPage />}
            >
                {userSettingsRouterEntryFunctions.map((createRoute) =>
                    // Usually elements of the `modules.getComponentsByName(...)` are react components
                    // and should be used as <Component />. However, this doesn't work her for the router
                    // because it needs to return a <Route> element. Therefore we call the function directly.
                    createRoute(),
                )}
            </Route>
            <Route
                path={`/settings/user/*`}
                element={<Navigate to="/settings/user" replace />}
            />
        </>
    );
}
