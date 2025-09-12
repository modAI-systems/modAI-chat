import type { User } from '@/services/userService'

/**
 * Immutable Session class that maintains the current user session in the browser
 */
export class Session {
    private readonly user: User

    constructor(user: User) {
        this.user = user
    }

    /**
     * Get the current user object
     */
    getUser(): User {
        return this.user
    }
}
