import { afterEach, describe, expect, it, vi } from "vitest";
import type { Modules } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import { FETCH_SERVICE_TYPE } from "@/modules/fetch-service/index.svelte.js";
import sessionService from "./sessionServiceImpl.svelte";

function makeModules(fetchFn: typeof fetch): Modules {
    const fetchService: FetchService = {
        fetch: (_modules, input, init) => fetchFn(input, init),
    };
    return {
        getOne: <T>(type: string): T | null => {
            if (type === FETCH_SERVICE_TYPE)
                return fetchService as unknown as T;
            return null;
        },
        getAll: <T>(_type: string): T[] => [],
    };
}

describe("sessionServiceImpl", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("refresh + isSessionActive", () => {
        it("marks session active when backend returns authenticated=true", async () => {
            const modules = makeModules(
                vi.fn(
                    async () =>
                        new Response(JSON.stringify({ authenticated: true }), {
                            status: 200,
                        }),
                ),
            );

            await sessionService.refresh(modules);

            expect(sessionService.isSessionActive(modules)).toBe(true);
        });

        it("marks session inactive when backend returns authenticated=false", async () => {
            const activeModules = makeModules(
                vi.fn(
                    async () =>
                        new Response(JSON.stringify({ authenticated: true }), {
                            status: 200,
                        }),
                ),
            );
            await sessionService.refresh(activeModules); // set active first

            const inactiveModules = makeModules(
                vi.fn(
                    async () =>
                        new Response(JSON.stringify({ authenticated: false }), {
                            status: 200,
                        }),
                ),
            );
            await sessionService.refresh(inactiveModules);

            expect(sessionService.isSessionActive(inactiveModules)).toBe(false);
        });

        it("marks session inactive on network error", async () => {
            const activeModules = makeModules(
                vi.fn(
                    async () =>
                        new Response(JSON.stringify({ authenticated: true }), {
                            status: 200,
                        }),
                ),
            );
            await sessionService.refresh(activeModules); // set active first

            const errorModules = makeModules(
                vi.fn().mockRejectedValue(new Error("network error")),
            );
            await sessionService.refresh(errorModules);

            expect(sessionService.isSessionActive(errorModules)).toBe(false);
        });

        it("calls /api/auth/session via FetchService", async () => {
            const fetchFn = vi.fn(
                async () =>
                    new Response(JSON.stringify({ authenticated: true }), {
                        status: 200,
                    }),
            );
            const modules = makeModules(fetchFn);

            await sessionService.refresh(modules);

            expect(fetchFn).toHaveBeenCalledWith(
                "/api/auth/session",
                undefined,
            );
        });
    });
});
