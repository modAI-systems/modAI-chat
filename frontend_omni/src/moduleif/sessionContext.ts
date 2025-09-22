/**
 * Module Name: Session Management
 *
 * Module Types: ContextProvider
 *
 * Description: This module provides session management functionality,
 *      maintaining user session state in the browser.
 *
 *
 * What this module offers to users: `useSession(): SessionContextType`
 *    A React hook to access session data and methods to refresh or clear the session.
 *
 * What this module demands when used: None
 *
 * What this module demands from other modules: None
 *
 * Implementation Nodes: The actual module implementation for this interface
 *     must create  a React Context Provider component that uses the
 *     Session class to manage session state.
 *
 */

import type { User } from "@/moduleif/userService"
import { createContext, useContext } from "react"


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

export interface SessionContextType {
    session: Session | null
    isLoading: boolean
    refreshSession: () => Promise<void>
    clearSession: () => void
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined)

/**
 * Hook to use the session context
 */
export function useSession(): SessionContextType {
    const context = useContext(SessionContext)
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider')
    }
    return context
}
