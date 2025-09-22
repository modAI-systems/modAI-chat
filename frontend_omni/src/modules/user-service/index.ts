import { HttpUserService } from "./HttpUserService";
import type { User } from "@/moduleif/userService";

// Create a default instance of the service
const userService = new HttpUserService();

/**
 * Fetches the current authenticated user from the backend
 *
 * This is a convenience function that uses the default HttpUserService instance.
 * For more advanced usage, consider using the UserService interface directly.
 *
 * @returns Promise<User> The current user data
 * @throws Error if the request fails or user is not authenticated
 */
export async function getCurrentUser(): Promise<User> {
    return userService.getCurrentUser();
}

// Export the service class and interface for advanced usage
export { HttpUserService } from "./HttpUserService";

// Export the hook for components that need access to the user service
export { useUserService } from "@/moduleif/userService";
