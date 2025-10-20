import type { Session } from "@/modules/session-provider";
import type { UserService } from "@/modules/user-service";

/**
 * Creates a new session by refreshing user data from the user service
 *
 * @returns Promise<Session | null> A new Session instance if successful, null if authentication fails
 */
export async function refreshSession(
    userService: UserService,
): Promise<Session | null> {
    try {
        const user = await userService.fetchCurrentUser();

        if (user) {
            return { user };
        }
        return null;
    } catch (error) {
        console.warn("Failed to refresh session:", error);
        return null;
    }
}
