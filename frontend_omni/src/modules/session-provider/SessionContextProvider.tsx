import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type React from "react";
import { startTransition, useCallback } from "react";
import { useUserService } from "@/modules/user-service";
import { SessionContext, type SessionContextType } from ".";
import { refreshSession as refreshSessionService } from "./sessionService";

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
    const queryClient = useQueryClient();

    const { data: session } = useSuspenseQuery({
        queryKey: ["userSession"],
        queryFn: async () => await refreshSessionService(userService),
    });

    const refreshSession = useCallback(() => {
        startTransition(() => {
            queryClient.invalidateQueries({ queryKey: ["userSession"] });
        });
    }, [queryClient]);

    const clearSession = useCallback(() => {
        queryClient.setQueryData(["userSession"], null);
    }, [queryClient]);

    const contextValue: SessionContextType = {
        session,
        refreshSession,
        clearSession,
    };

    return <SessionContext value={contextValue}>{children}</SessionContext>;
}
