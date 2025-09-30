import { Route } from "react-router-dom";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";

export function AuthRouterEntry() {
    return (
        <>
            <Route
                key={`authentication-login`}
                path="/login"
                element={<LoginPage />}
            />
            <Route
                key={`authentication-register`}
                path="/register"
                element={<RegisterPage />}
            />
        </>
    );
}
