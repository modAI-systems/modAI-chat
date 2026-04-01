import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModuleDependencies } from "@/core/module-system/index.js";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import { create } from "./sessionServiceImpl.svelte";

function makeDeps(fetchFn: typeof fetch): ModuleDependencies {
    const fetchService: FetchService = {
        fetch: (input, init) => fetchFn(input, init),
    };
    return {
        getOne: <T>(name: string): T => {
            if (name === "fetchService") return fetchService as unknown as T;
            throw new Error(`Unknown dep "${name}"`);
        },
        getAll: <T>(_name: string): T[] => [],
    };
}

describe("sessionServiceImpl", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("refresh + isSessionActive", () => {
        it("marks session active when backend returns authenticated=true", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response(
                                JSON.stringify({ authenticated: true }),
                                {
                                    status: 200,
                                },
                            ),
                    ),
                ),
            );

            await service.refresh();

            expect(service.isSessionActive()).toBe(true);
        });

        it("marks session inactive when backend returns authenticated=false", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response(
                                JSON.stringify({ authenticated: false }),
                                {
                                    status: 200,
                                },
                            ),
                    ),
                ),
            );

            await service.refresh();

            expect(service.isSessionActive()).toBe(false);
        });

        it("marks session inactive on network error", async () => {
            const fetchFn = vi
                .fn()
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ authenticated: true }), {
                        status: 200,
                    }),
                )
                .mockRejectedValueOnce(new Error("network error"));
            const service = create(makeDeps(fetchFn));

            await service.refresh(); // set active
            await service.refresh(); // network error

            expect(service.isSessionActive()).toBe(false);
        });

        it("calls /api/auth/session via FetchService", async () => {
            const fetchFn = vi.fn(
                async () =>
                    new Response(JSON.stringify({ authenticated: true }), {
                        status: 200,
                    }),
            );
            const service = create(makeDeps(fetchFn));

            await service.refresh();

            expect(fetchFn).toHaveBeenCalledWith(
                "/api/auth/session",
                undefined,
            );
        });
    });
});
