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

    describe("refresh", () => {
        it("returns active=true when backend returns 200", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response(JSON.stringify({ user_id: "admin" }), {
                                status: 200,
                            }),
                    ),
                ),
            );

            const result = await service.getActiveSession();

            expect(result.active).toBe(true);
        });

        it("returns active=false when backend returns 401", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response("Unauthorized", { status: 401 }),
                    ),
                ),
            );

            const result = await service.getActiveSession();

            expect(result.active).toBe(false);
        });

        it("returns active=false on network error", async () => {
            const service = create(
                makeDeps(vi.fn().mockRejectedValue(new Error("network error"))),
            );

            const result = await service.getActiveSession();

            expect(result.active).toBe(false);
        });

        it("calls /api/auth/userinfo via FetchService", async () => {
            const fetchFn = vi.fn(
                async () =>
                    new Response(JSON.stringify({ user_id: "admin" }), {
                        status: 200,
                    }),
            );
            const service = create(makeDeps(fetchFn));

            await service.getActiveSession();

            expect(fetchFn).toHaveBeenCalledWith(
                "/api/auth/userinfo",
                undefined,
            );
        });

        it("returns userInfo with user_id and name when backend returns them", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response(
                                JSON.stringify({
                                    user_id: "u-42",
                                    additional: { name: "Alice Wonderland" },
                                }),
                                { status: 200 },
                            ),
                    ),
                ),
            );

            const result = await service.getActiveSession();

            expect(result.userInfo).toEqual({
                user_id: "u-42",
                name: "Alice Wonderland",
            });
        });

        it("returns userInfo with name=null when backend omits it", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response(JSON.stringify({ user_id: "u-99" }), {
                                status: 200,
                            }),
                    ),
                ),
            );

            const result = await service.getActiveSession();

            expect(result.userInfo).toEqual({
                user_id: "u-99",
                name: null,
            });
        });

        it("returns userInfo=null when session is inactive (401)", async () => {
            const service = create(
                makeDeps(
                    vi.fn(
                        async () =>
                            new Response("Unauthorized", { status: 401 }),
                    ),
                ),
            );

            const result = await service.getActiveSession();

            expect(result.userInfo).toBeNull();
        });

        it("returns userInfo=null on network error", async () => {
            const service = create(
                makeDeps(vi.fn().mockRejectedValue(new Error("network error"))),
            );

            const result = await service.getActiveSession();

            expect(result.userInfo).toBeNull();
        });
    });
});
