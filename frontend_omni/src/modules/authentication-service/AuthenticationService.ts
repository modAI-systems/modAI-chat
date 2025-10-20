/**
 * Authentication Service Implementation
 *
 * Provides concrete implementation of the AuthService interface for handling
 * user authentication operations including login, signup, and logout.
 */

import type {
    AuthError,
    AuthService,
    LoginRequest,
    LoginResponse,
    SignupRequest,
    SignupResponse,
} from ".";

export class AuthenticationService implements AuthService {
    /**
     * Authenticates a user with email and password
     *
     * @param credentials User login credentials
     * @returns Promise<LoginResponse> Success message from backend
     * @throws Error if login fails
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await fetch("/api/v1/auth/login", {
            method: "POST",
            credentials: "include", // Include cookies for session authentication
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            await this.handleApiError(response, "Login failed");
        }

        const result: LoginResponse = await response.json();
        return result;
    }

    /**
     * Registers a new user account
     *
     * @param credentials User signup credentials
     * @returns Promise<SignupResponse> Success message and user ID from backend
     * @throws Error if signup fails
     */
    async signup(credentials: SignupRequest): Promise<SignupResponse> {
        const response = await fetch("/api/v1/auth/signup", {
            method: "POST",
            credentials: "include", // Include cookies for session authentication
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            await this.handleApiError(response, "Signup failed");
        }

        const result: SignupResponse = await response.json();
        return result;
    }

    /**
     * Logs out the current user
     *
     * @returns Promise<LoginResponse> Success message from backend
     * @throws Error if logout fails
     */
    async logout(): Promise<LoginResponse> {
        const response = await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include", // Include cookies for session authentication
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            await this.handleApiError(response, "Logout failed");
        }

        const result: LoginResponse = await response.json();
        return result;
    }

    /**
     * Handles errors from authentication API responses
     */
    private async handleApiError(
        response: Response,
        defaultMessage: string,
    ): Promise<never> {
        let errorMessage = defaultMessage;

        try {
            const errorData: AuthError = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // If we can't parse the error response, use status text
            errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
    }
}
