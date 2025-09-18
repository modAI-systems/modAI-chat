import { Route } from "react-router-dom";
import { Metadata } from "./Metadata";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";


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
