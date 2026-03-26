import type { Modules } from "@/core/module-system/index.js";
import { getModules } from "@/core/module-system/index.js";

export const FETCH_SERVICE_TYPE = "FetchService";

/**
 * Public interface for the fetch service.
 * Use this instead of raw fetch() for backend API calls.
 * Implementations handle cross-cutting concerns like session-expiry redirects.
 */
export interface FetchService {
    fetch(
        modules: Modules,
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response>;
}

/**
 * Returns the active FetchService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getFetchService(): FetchService {
    const service = getModules().getOne<FetchService>(FETCH_SERVICE_TYPE);
    if (!service) {
        throw new Error("FetchService module not registered");
    }
    return service;
}
