import { createContext, useContext } from "react";

// Authentication Request/Response Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    full_name?: string;
}

export interface LoginResponse {
    message: string;
}

export interface SignupResponse {
    message: string;
    user_id: string;
}

export interface AuthError {
    detail: string;
}

// Authentication Service Interface
export interface AuthService {
    /**
     * Authenticates a user with email and password
     *
     * @param credentials User login credentials
     * @returns Promise<LoginResponse> Success message from backend
     * @throws Error if login fails
     */
    login(credentials: LoginRequest): Promise<LoginResponse>;

    /**
     * Registers a new user account
     *
     * @param credentials User signup credentials
     * @returns Promise<SignupResponse> Success message and user ID from backend
     * @throws Error if signup fails
     */
    signup(credentials: SignupRequest): Promise<SignupResponse>;

    /**
     * Logs out the current user
     *
     * @returns Promise<LoginResponse> Success message from backend
     * @throws Error if logout fails
     */
    logout(): Promise<LoginResponse>;
}

// Create context for the authentication service
export const AuthServiceContext = createContext<AuthService | undefined>(
    undefined,
);

/**
 * Hook to access the authentication service from any component
 *
 * @returns AuthService instance
 * @throws Error if used outside of AuthServiceProvider
 */
export function useAuthService(): AuthService {
    const context = useContext(AuthServiceContext);
    if (!context) {
        throw new Error(
            "useAuthService must be used within an AuthServiceProvider",
        );
    }
    return context;
}
