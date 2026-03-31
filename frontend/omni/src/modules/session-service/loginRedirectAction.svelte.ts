import type { Modules } from "@/core/module-system/index.js";
import type { NoSessionAction } from "./index.svelte.js";

class LoginRedirectAction implements NoSessionAction {
    execute(_modules: Modules): void {
        window.location.href = `/api/auth/login?redirect_uri=${encodeURIComponent(window.location.href)}`;
    }
}

export default new LoginRedirectAction();
