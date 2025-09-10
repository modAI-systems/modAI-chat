import type { FullPageModule, WebModule } from "@/types/module";
import { Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

class Module implements FullPageModule {
    id = 'login';
    version = '1.0.0';
    description = 'User authentication pages (login and register)';
    author = 'ModAI Team';

    path = '/login';

    createFullPageRoute(): React.ReactElement {
        return (
            <>
                <Route
                    key={`${this.id}-login`}
                    path="/login"
                    element={<LoginPage />}
                />
                <Route
                    key={`${this.id}-register`}
                    path="/register"
                    element={<RegisterPage />}
                />
            </>
        );
    }
}

export function createModule(): WebModule {
    return new Module()
}
