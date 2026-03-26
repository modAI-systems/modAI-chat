import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sessionService from "./sessionServiceImpl.svelte";

function mockAuthResponse(authenticated: boolean): void {
    vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ authenticated }), { status: 200 }),
    );
}

describe("sessionServiceImpl", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("refresh + isSessionActive", () => {
        it("marks session active when backend returns authenticated=true", async () => {
            mockAuthResponse(true);

            await sessionService.refresh();

            expect(sessionService.isSessionActive()).toBe(true);
        });

        it("marks session inactive when backend returns authenticated=false", async () => {
            mockAuthResponse(true);
            await sessionService.refresh(); // set active first

            mockAuthResponse(false);
            await sessionService.refresh();

            expect(sessionService.isSessionActive()).toBe(false);
        });

        it("marks session inactive on network error", async () => {
            mockAuthResponse(true);
            await sessionService.refresh(); // set active first

            vi.mocked(fetch).mockRejectedValue(new Error("network error"));
            await sessionService.refresh();

            expect(sessionService.isSessionActive()).toBe(false);
        });

        it("calls /api/auth/session with credentials included", async () => {
            mockAuthResponse(true);

            await sessionService.refresh();

            expect(fetch).toHaveBeenCalledWith(
                "/api/auth/session",
                expect.objectContaining({ credentials: "include" }),
            );
        });
    });
});
