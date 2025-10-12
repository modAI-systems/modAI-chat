import React, { useEffect, useState, useCallback } from "react";
import { SessionService } from "./sessionService";
import { SessionContext, type Session, type SessionContextType } from ".";
import { useUserService } from "@/modules/user-service";

interface SessionProviderProps {
    children: React.ReactNode;
}

/**
 * SessionProvider component that manages session state using the Session class
 */
export default function SessionContextProvider({
    children,
}: SessionProviderProps): React.JSX.Element {
    const userService = useUserService();
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshSession = useCallback(async () => {
        setIsLoading(true);
        try {
            // Use the session service to refresh/create a new session
            if (userService) {
                const newSession = await SessionService.refreshSession(
                    userService
                );
                setSession(newSession);
            } else {
                setSession(null);
            }
        } catch (error) {
            // Clear session on error
            setSession(null);
            console.warn("Failed to refresh session:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userService]);

    const clearSession = useCallback(() => {
        setSession(null);
    }, []);

    // Initialize session on mount
    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    const contextValue: SessionContextType = {
        session,
        isLoading,
        refreshSession,
        clearSession,
    };

    return <SessionContext value={contextValue}>{children}</SessionContext>;
}
