import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session } from './Session'
import { SessionService } from './sessionService'

interface SessionContextType {
    session: Session | null
    isLoading: boolean
    refreshSession: () => Promise<void>
    clearSession: () => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

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

interface SessionProviderProps {
    children: React.ReactNode
}

/**
 * SessionProvider component that manages session state using the Session class
 */
export function SessionProvider({ children }: SessionProviderProps): React.ReactElement {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const refreshSession = useCallback(async () => {
        setIsLoading(true)
        try {
            // Use the session service to refresh/create a new session
            const newSession = await SessionService.refreshSession()
            setSession(newSession)
        } catch (error) {
            // Clear session on error
            setSession(null)
            console.warn('Failed to refresh session:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const clearSession = useCallback(() => {
        setSession(null)
    }, [])

    // Initialize session on mount
    useEffect(() => {
        refreshSession()
    }, [refreshSession])

    const contextValue: SessionContextType = {
        session,
        isLoading,
        refreshSession,
        clearSession,
    }

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    )
}
