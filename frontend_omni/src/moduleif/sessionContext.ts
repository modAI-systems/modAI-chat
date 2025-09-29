
import type { User } from "@/moduleif/userService";
import { createContext, useContext } from "react";

/**
 * Immutable Session class that maintains the current user session in the browser
 */
export interface Session {
    user: User;
}

export interface SessionContextType {
    session: Session | null;
    isLoading: boolean;
    refreshSession: () => Promise<void>;
    clearSession: () => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(
    undefined
);

/**
 * Hook to use the session context
 */
export function useSession(): SessionContextType {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error("useSession must be used within a SessionProvider");
    }
    return context;
}
