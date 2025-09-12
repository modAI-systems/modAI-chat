import { Route } from "react-router-dom";
import ChatComponent from "./ChatComponent";
import { Metadata, path } from "./Metadata";

export function SidebarPageRoute() {

    return <Route
        key={Metadata.id}
        path={path}
        element={<ChatComponent />}
    />;
}
