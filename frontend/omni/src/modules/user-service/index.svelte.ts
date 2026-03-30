import { getModules } from "@/core/module-system/index.js";

export const USER_SERVICE_TYPE = "UserService";

export interface User {
    id: string;
    email: string;
    full_name: string | null;
}

/**
 * Fetches and caches the currently logged-in user from the backend.
 * Call load() once after session is established, then read user() reactively.
 */
export interface UserService {
    load(): Promise<void>;
    user(): User | null;
    logout(): void;
}

/**
 * Returns the active UserService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getUserService(): UserService {
    const service = getModules().getOne<UserService>(USER_SERVICE_TYPE);
    if (!service) {
        throw new Error("UserService module not registered");
    }
    return service;
}
