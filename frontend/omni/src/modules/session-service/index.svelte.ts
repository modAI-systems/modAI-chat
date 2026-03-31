import type { Modules } from "@/core/module-system/index.js";

export const SESSION_SERVICE_TYPE = "SessionService";
export const NO_SESSION_ACTION_TYPE = "NoSessionAction";

/**
 * Manages backend session state.
 * Call refresh() to probe the current session, then isSessionActive() to read it.
 */
export interface SessionService {
    refresh(modules: Modules): Promise<void>;
    isSessionActive(modules: Modules): boolean;
}

/**
 * Called when no active session is detected.
 * Implementations decide what to do (e.g. redirect to login).
 */
export interface NoSessionAction {
    execute(modules: Modules): void;
}
