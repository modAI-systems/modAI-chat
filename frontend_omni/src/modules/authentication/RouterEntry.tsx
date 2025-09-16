import { Route } from "react-router-dom";
import { Metadata } from "./Metadata";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";


export function RouterEntry() {
    return (
        <>
            <Route
                key={`${Metadata.id}-login`}
                path="/login"
                element={<LoginPage />}
            />
            <Route
                key={`${Metadata.id}-register`}
                path="/register"
                element={<RegisterPage />}
            />
        </>
    );
}
