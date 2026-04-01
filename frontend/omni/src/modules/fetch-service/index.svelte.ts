/**
 * Public interface for the fetch service.
 * Use this instead of raw fetch() for backend API calls.
 * Implementations handle cross-cutting concerns like session-expiry redirects.
 */
export interface FetchService {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
