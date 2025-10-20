import { Route } from "react-router-dom";
import { SessionGuardRoute } from "@/modules/session-provider";
import { LoginPage } from "./LoginPage";
import RegisterPage from "./RegisterPage";

export default function AuthRouterEntry() {
    return (
        <>
            <Route
                key={"authentication-login"}
                path="/login"
                element={
                    <SessionGuardRoute requireSession={false}>
                        <LoginPage />
                    </SessionGuardRoute>
                }
            />
            <Route
                key={"authentication-register"}
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
