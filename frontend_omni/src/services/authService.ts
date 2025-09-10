/**
 * Service for authentication-related API calls
 */

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

/**
 * Authenticates a user with email and password
 *
 * @param credentials User login credentials
 * @returns Promise<LoginResponse> Success message from backend
 * @throws Error if login fails
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include', // Include cookies for session authentication
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        let errorMessage = 'Login failed';

        try {
            const errorData: AuthError = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // If we can't parse the error response, use status text
            errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
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
export async function signup(credentials: SignupRequest): Promise<SignupResponse> {
    const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        credentials: 'include', // Include cookies for session authentication
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        let errorMessage = 'Signup failed';

        try {
            const errorData: AuthError = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // If we can't parse the error response, use status text
            errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
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
export async function logout(): Promise<LoginResponse> {
    const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies for session authentication
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        let errorMessage = 'Logout failed';

        try {
            const errorData: AuthError = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
    }

    const result: LoginResponse = await response.json();
    return result;
}
