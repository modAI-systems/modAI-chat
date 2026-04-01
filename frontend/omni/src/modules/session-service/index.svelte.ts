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
