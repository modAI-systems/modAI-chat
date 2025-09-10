import type { FullPageModule, WebModule } from "@/types/module";
import { Route } from "react-router-dom";
import LoginPage from "./LoginPage";

class Module implements FullPageModule {
    id = 'login';
    version = '1.0.0';
    description = 'User login page';
    author = 'ModAI Team';

    path = '/login';

    createFullPageRoute(): React.ReactElement {
        return <Route
            key={this.id}
            path={this.path}
            element={<LoginPage />}
        />
            ;
    }
}

export function createModule(): WebModule {
    return new Module()
}
