import { createContext, useContext } from "react";

export interface User {
    id: string;
    email: string;
    full_name?: string;
}

/**
 * Service contract for user-related operations
 */
export interface UserService {
    /**
     * Fetches the current authenticated user from the backend
     *
     * @returns Promise<User> The current user data
     * @throws Error if the request fails or user is not authenticated
     */
    fetchCurrentUser(): Promise<User>;
}

// Create context for the user service
export const UserServiceContext = createContext<UserService | undefined>(
    undefined
);

/**
 * Hook to access the user service from any component
 *
 * @returns UserService instance
 * @throws Error if used outside of UserServiceProvider
 */
export function useUserService(): UserService {
    const context = useContext(UserServiceContext);
    if (!context) {
        throw new Error(
            "useUserService must be used within a UserServiceProvider"
        );
    }
    return context;
}
