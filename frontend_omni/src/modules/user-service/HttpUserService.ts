import type { User, UserService } from "@/moduleif/userService";

/**
 * Implementation of UserService for HTTP API communication
 */
export class HttpUserService implements UserService {
    /**
     * Fetches the current authenticated user from the backend
     *
     * @returns Promise<User> The current user data
     * @throws Error if the request fails or user is not authenticated
     */
    async getCurrentUser(): Promise<User> {
        const response = await fetch(`/api/v1/user`, {
            method: 'GET',
            credentials: 'include', // Include cookies for session authentication
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('User not authenticated');
            }
            throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const user: User = await response.json();
        return user;
    }
}
