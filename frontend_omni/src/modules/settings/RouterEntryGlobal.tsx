import { Navigate, Route } from "react-router-dom";
import { Metadata, globalSettingsPath } from "./MetaGlobalSettings";
import { useModules } from "@/contexts/ModuleManagerContext";
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
                    createRoute()
                ))}
            </Route>
            <Route path={`${globalSettingsPath}/*`} element={<Navigate to={globalSettingsPath} replace />} />
        </>
    );
}
