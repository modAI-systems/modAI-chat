import React, { useCallback, startTransition } from "react";
import { SessionService } from "./sessionService";
import { SessionContext, type SessionContextType } from ".";
import { useUserService } from "@/modules/user-service";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";

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
        queryFn: () => SessionService.refreshSession(userService!),
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
