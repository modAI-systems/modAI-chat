/**
 * Authentication Service Context Provider
 *
 * Provides the AuthenticationService instance to the entire application
 * via React Context.
 */

import React from 'react';
import { AuthServiceContext } from "@/moduleif/authenticationService";
import { AuthenticationService } from './AuthenticationService';

/**
 * Context provider that makes the authentication service available
 * throughout the application component tree
 */
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
    const authServiceInstance = new AuthenticationService();

    return (
        <AuthServiceContext value={authServiceInstance}>
            {children}
        </AuthServiceContext>
    );
}
