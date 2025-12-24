import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type React from "react";
import { startTransition, useCallback, useEffect } from "react";
import { type ModuleFlags, useModuleFlags } from "@/modules/module-system";
import { useUserService } from "@/modules/user-service";
import { type Session, SessionContext, type SessionContextType } from ".";
import { refreshSession as refreshSessionService } from "./sessionService";

interface SessionProviderProps {
    children: React.ReactNode;
}

const MODULE_FLAG_SESSION_ACTIVE = "sessionActive";

/**
 * SessionProvider component that manages session state using the Session class
 */
export function SessionContextProvider({
    children,
}: SessionProviderProps): React.JSX.Element {
    const userService = useUserService();
    const queryClient = useQueryClient();
    const moduleFlags = useModuleFlags();

    const { data: session } = useSuspenseQuery({
        queryKey: ["userSession"],
        queryFn: async () => await refreshSessionService(userService),
    });

    const refreshSession = useCallback(
        () =>
            startTransition(() =>
                queryClient.invalidateQueries({ queryKey: ["userSession"] }),
            ),
        [queryClient],
    );
    const clearSession = useCallback(
        () => queryClient.setQueryData(["userSession"], null),
        [queryClient],
    );

    useEffect(() => {
        updateModuleFlags(session, moduleFlags);
    }, [session, moduleFlags]);

    const contextValue: SessionContextType = {
        session,
        refreshSession,
        clearSession,
    };

    return <SessionContext value={contextValue}>{children}</SessionContext>;
}

function updateModuleFlags(session: Session | null, moduleFlags: ModuleFlags) {
    if (session) {
        moduleFlags.set(MODULE_FLAG_SESSION_ACTIVE);
    } else {
        moduleFlags.remove(MODULE_FLAG_SESSION_ACTIVE);
    }
}
