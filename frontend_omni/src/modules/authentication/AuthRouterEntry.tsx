import { Route } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import RegisterPage from "./RegisterPage";

export default function AuthRouterEntry() {
    return (
        <>
            <Route
                key="authentication-login"
                path="/login"
                element={
                    <LoginPage />
                }
            />
            <Route
                key="authentication-register"
                path="/register"
                element={
                    <RegisterPage />
                }
            />
        </>
    );
}
