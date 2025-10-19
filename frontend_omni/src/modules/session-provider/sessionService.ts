import type { Session } from "@/modules/session-provider";
import type { UserService } from "@/modules/user-service";

/**
 * Service for session-related operations
 */
export class SessionService {
    /**
     * Creates a new session by refreshing user data from the user service
     *
     * @returns Promise<Session | null> A new Session instance if successful, null if authentication fails
     */
    static async refreshSession(
        userService: UserService,
    ): Promise<Session | null> {
        try {
            const user = await userService.fetchCurrentUser();

            if (user) {
                return { user };
            } else {
                return null;
            }
        } catch (error) {
            console.warn("Failed to refresh session:", error);
            return null;
        }
    }
}
