export interface UserInfo {
    user_id: string;
    name: string | null;
}

export interface SessionState {
    active: boolean;
    userInfo: UserInfo | null;
}

/**
 * Probes backend session state.
 * Services are stateless — getActiveSession() fetches and returns the current
 * session state directly instead of caching it. Callers are responsible for
 * storing the result.
 */
export interface SessionService {
    getActiveSession(): Promise<SessionState>;
}

/**
 * Called when no active session is detected.
 * Implementations decide what to do (e.g. redirect to login).
 */
export interface NoSessionAction {
    execute(): void;
}
