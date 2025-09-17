/**
 * Authentication Service Context Provider
 *
 * Provides the AuthenticationService instance to the entire application
 * via React Context.
 */

import React, { createContext, useContext } from 'react';
import type { AuthService } from "@/moduleif/authenticationService";
import { AuthenticationService } from './AuthenticationService';

// Create context for the authentication service
const AuthServiceContext = createContext<AuthService | undefined>(undefined);

/**
 * Context provider that makes the authentication service available
 * throughout the application component tree
 */
export function ContextProvider({ children }: { children: React.ReactNode }) {
    const authServiceInstance = new AuthenticationService();

    return (
        <AuthServiceContext value={authServiceInstance}>
            {children}
        </AuthServiceContext>
    );
}

/**
 * Hook to access the authentication service from any component
 *
 * @returns AuthService instance
 * @throws Error if used outside of AuthServiceProvider
 */
export function useAuthService(): AuthService {
    const context = useContext(AuthServiceContext);
    if (!context) {
        throw new Error('useAuthService must be used within an AuthServiceProvider');
    }
    return context;
}
