import type { SessionService } from "./index.svelte.js";

class SessionServiceImpl implements SessionService {
    #sessionActive = false;

    async refresh(): Promise<void> {
        try {
            const response = await fetch("/api/auth/session", {
                credentials: "include",
            });
            const data = (await response.json()) as { authenticated: boolean };
            this.#sessionActive = data.authenticated;
        } catch {
            this.#sessionActive = false;
        }
    }

    isSessionActive(): boolean {
        return this.#sessionActive;
    }
}

export default new SessionServiceImpl();
