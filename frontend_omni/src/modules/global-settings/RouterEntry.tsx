import { Navigate, Route } from "react-router-dom";
import GlobalSettingsPage from "./GlobalSettingsPage";
import { Metadata, path } from "./Metadata";
import { useModules } from "@/contexts/ModuleManagerContext";

export function RouterEntry() {
    const modules = useModules()
    const routerEntryFunctions = modules.getComponentsByName("GlobalSettingsRouterEntry")

    return (
        <>
            <Route
                key={Metadata.id}
                path={path}
                element={<GlobalSettingsPage />}
            >
                {routerEntryFunctions.map((createRoute) => (
                    createRoute()
                ))}
            </Route>
            <Route path={`${path}/*`} element={<Navigate to={path} replace />} />
        </>
    );
}
