import React, { useEffect, useState, useCallback } from 'react'
import { SessionService } from './sessionService'
import { Session, SessionContext, type SessionContextType } from '@/moduleif/sessionContext'

interface SessionProviderProps {
    children: React.ReactNode
}

/**
 * SessionProvider component that manages session state using the Session class
 */
export function ContextProvider({ children }: SessionProviderProps): React.ReactElement {
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
        <SessionContext value={contextValue}>
            {children}
        </SessionContext>
    )
}
