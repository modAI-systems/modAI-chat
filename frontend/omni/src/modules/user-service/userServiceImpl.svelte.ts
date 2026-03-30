import type { User, UserService } from "./index.svelte.js";

class UserServiceImpl implements UserService {
    #user: User | null = $state.raw(null);

    async load(): Promise<void> {
        try {
            const response = await fetch("/api/user", {
                credentials: "include",
            });
            if (response.ok) {
                this.#user = (await response.json()) as User;
            } else {
                this.#user = null;
            }
        } catch {
            this.#user = null;
        }
    }

    user(): User | null {
        return this.#user;
    }

    logout(): void {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "/api/auth/logout";
        document.body.appendChild(form);
        form.submit();
    }
}

export default new UserServiceImpl();
