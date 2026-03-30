import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userService from "./userServiceImpl.svelte";

const mockUser = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
};

describe("userServiceImpl", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("load + user", () => {
        it("returns user after successful load", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockUser), { status: 200 }),
            );

            await userService.load();

            expect(userService.user()).toEqual(mockUser);
        });

        it("returns null when backend returns non-ok status", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Unauthorized", { status: 401 }),
            );

            await userService.load();

            expect(userService.user()).toBeNull();
        });

        it("returns null on network error", async () => {
            // Set a user first so we can verify it gets cleared
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockUser), { status: 200 }),
            );
            await userService.load();

            vi.mocked(fetch).mockRejectedValue(new Error("network error"));
            await userService.load();

            expect(userService.user()).toBeNull();
        });

        it("calls /api/user with credentials included", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockUser), { status: 200 }),
            );

            await userService.load();

            expect(fetch).toHaveBeenCalledWith(
                "/api/user",
                expect.objectContaining({ credentials: "include" }),
            );
        });
    });

    describe("logout", () => {
        it("submits a POST form to /api/auth/logout", () => {
            const submitSpy = vi.fn();
            const appendSpy = vi.fn();
            vi.spyOn(document, "createElement").mockReturnValue({
                method: "",
                action: "",
                submit: submitSpy,
            } as unknown as HTMLFormElement);
            vi.spyOn(document.body, "appendChild").mockImplementation(
                appendSpy,
            );

            userService.logout();

            const form = appendSpy.mock.calls[0][0];
            expect(form.method).toBe("POST");
            expect(form.action).toBe("/api/auth/logout");
            expect(submitSpy).toHaveBeenCalled();
        });
    });
});
