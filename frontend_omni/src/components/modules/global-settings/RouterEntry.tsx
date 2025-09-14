import { Route } from "react-router-dom";
import GlobalSettingsComponent from "./GlobalSettingsComponent";
import { Metadata, path } from "./Metadata";

export function RouterEntry() {
    return (
        <Route
            key={Metadata.id}
            path={path}
            element={<GlobalSettingsComponent />}
        />
    );
}
