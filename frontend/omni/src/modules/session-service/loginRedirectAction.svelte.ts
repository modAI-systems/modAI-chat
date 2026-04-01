import type { NoSessionAction } from "./index.svelte.js";

class LoginRedirectAction implements NoSessionAction {
    execute(): void {
        window.location.href = `/api/auth/login?redirect_uri=${encodeURIComponent(window.location.href)}`;
    }
}

export function create(): NoSessionAction {
    return new LoginRedirectAction();
}
