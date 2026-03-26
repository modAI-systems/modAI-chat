import { getModules } from "@/core/module-system/index.js";

export const SESSION_SERVICE_TYPE = "SessionService";
export const NO_SESSION_ACTION_TYPE = "NoSessionAction";

/**
 * Manages backend session state.
 * Call refresh() to probe the current session, then isSessionActive() to read it.
 */
export interface SessionService {
    refresh(): Promise<void>;
    isSessionActive(): boolean;
}

/**
 * Called when no active session is detected.
 * Implementations decide what to do (e.g. redirect to login).
 */
export interface NoSessionAction {
    execute(): void;
}

/**
 * Returns the active SessionService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getSessionService(): SessionService {
    const service = getModules().getOne<SessionService>(SESSION_SERVICE_TYPE);
    if (!service) {
        throw new Error("SessionService module not registered");
    }
    return service;
}

/**
 * Returns the active NoSessionAction from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getNoSessionAction(): NoSessionAction {
    const action = getModules().getOne<NoSessionAction>(NO_SESSION_ACTION_TYPE);
    if (!action) {
        throw new Error("NoSessionAction module not registered");
    }
    return action;
}
