import { Navigate, Route } from "react-router-dom";
import { Metadata, globalSettingsPath } from "./MetaGlobalSettings";
import { useModules } from "@/moduleif/moduleSystem";
import { GlobalSettingsPage } from "./SettingsPage";

export function RouterEntry() {
    const modules = useModules()
    const globalSettingsRouterEntryFunctions = modules.getComponentsByName("GlobalSettingsRouterEntry")

    return (
        <>
            <Route
                key={Metadata.id}
                path={globalSettingsPath}
                element={<GlobalSettingsPage />}
            >
                {globalSettingsRouterEntryFunctions.map((createRoute) => (
                    // Usually elements of the `modules.getComponentsByName(...)` are react components
                    // and should be used as <Component />. However, this doesn't work her for the router
                    // because it needs to return a <Route> element. Therefore we call the function directly.
                    (createRoute as Function)()
                ))}
            </Route>
            <Route path={`${globalSettingsPath}/*`} element={<Navigate to={globalSettingsPath} replace />} />
        </>
    );
}
