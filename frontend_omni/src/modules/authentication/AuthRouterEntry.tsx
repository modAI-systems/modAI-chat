import { Route } from "react-router-dom";
import RegisterPage from "./RegisterPage";
import { LoginPage } from "./LoginPage";
import { SessionGuardRoute } from "@/modules/session-provider";

export default function AuthRouterEntry() {
    return (
        <>
            <Route
                key={`authentication-login`}
                path="/login"
                element={
                    <SessionGuardRoute requireSession={false}>
                        <LoginPage />
                    </SessionGuardRoute>
                }
            />
            <Route
                key={`authentication-register`}
                path="/register"
                element={
                    <SessionGuardRoute requireSession={false}>
                        <RegisterPage />
                    </SessionGuardRoute>
                }
            />
        </>
    );
}
