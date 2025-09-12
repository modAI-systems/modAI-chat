import type { FullPageModule, SidebarModule, WebModule } from "@/types/module";
import { Route } from "react-router-dom";
import React from "react";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { LogoutButton } from "./LogoutButton";

class Module implements FullPageModule, SidebarModule {
    id = 'login';
    version = '1.0.0';
    description = 'User authentication pages (login and register) and logout functionality';
    author = 'ModAI Team';
    dependentModules = [];

    path = '/login';

    install() {
        // Not needed
    }

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

    createSidebarItem(): React.ReactElement | null {
        return null; // Not needed
    }

    createSidebarFooterItem(): React.ReactElement | null {
        return <LogoutButton key={`${this.id}-logout`} />;
    }
}

export function createModule(): WebModule {
    return new Module()
}

export function moduleDependencies(): string[] {
    return ["session"];
}
