import { Navigate, Route } from "react-router-dom";
import { useModules } from "@/modules/module-system";
import { GlobalSettingsPage } from "./SettingsPage";

export default function RouterEntryGlobal() {
    const modules = useModules();
    const globalSettingsRouterEntryFunctions = modules.getAll<
        () => React.ReactElement
    >("GlobalSettingsRouterEntry");

    return (
        <>
            <Route
                key="global-settings"
                path="/settings/global"
                element={<GlobalSettingsPage />}
            >
                {globalSettingsRouterEntryFunctions.map((createRoute) =>
                    // Usually elements of the `modules.getComponentsByName(...)` are react components
                    // and should be used as <Component />. However, this doesn't work her for the router
                    // because it needs to return a <Route> element. Therefore we call the function directly.
                    createRoute(),
                )}
            </Route>
            <Route
                path={"/settings/global/*"}
                element={<Navigate to="/settings/global" replace />}
            />
        </>
    );
}
