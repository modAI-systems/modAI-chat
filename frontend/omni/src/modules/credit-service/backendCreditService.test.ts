import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import creditService from "./backendCreditService.svelte";

const mockAccount = {
    user_id: "user-123",
    tier: "free",
    tier_status: "active",
    tier_credits_available: 50,
    tier_cost_eur: 0,
    topup_credits_available: 0,
    topup_cost_eur: 0,
    period_start: "2026-03-01T00:00:00",
};

describe("backendCreditService", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("load + credits", () => {
        it("returns credit account after successful load", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockAccount), { status: 200 }),
            );

            await creditService.load();

            expect(creditService.credits()).toEqual(mockAccount);
        });

        it("returns null when backend returns non-ok status", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Unauthorized", { status: 401 }),
            );

            await creditService.load();

            expect(creditService.credits()).toBeNull();
        });

        it("returns null on network error", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockAccount), { status: 200 }),
            );
            await creditService.load();

            vi.mocked(fetch).mockRejectedValue(new Error("network error"));
            await creditService.load();

            expect(creditService.credits()).toBeNull();
        });

        it("calls /api/credits with credentials included", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(mockAccount), { status: 200 }),
            );

            await creditService.load();

            expect(fetch).toHaveBeenCalledWith(
                "/api/credits",
                expect.objectContaining({ credentials: "include" }),
            );
        });
    });

    describe("consume", () => {
        it("sends POST to /api/credits/consume and reloads", async () => {
            const consumeResult = {
                success: true,
                tier_credits_available: 45,
                topup_credits_available: 0,
            };
            const updatedAccount = {
                ...mockAccount,
                tier_credits_available: 45,
                tier_cost_eur: 0.1,
            };

            vi.mocked(fetch)
                .mockResolvedValueOnce(
                    new Response(JSON.stringify(consumeResult), {
                        status: 200,
                    }),
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify(updatedAccount), {
                        status: 200,
                    }),
                );

            const result = await creditService.consume(5);

            expect(result.success).toBe(true);
            expect(result.tier_credits_available).toBe(45);
            expect(fetch).toHaveBeenCalledWith(
                "/api/credits/consume",
                expect.objectContaining({
                    method: "POST",
                    credentials: "include",
                    body: JSON.stringify({ amount: 5 }),
                }),
            );
        });

        it("throws on non-ok response", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Insufficient credits", { status: 402 }),
            );

            await expect(creditService.consume(100)).rejects.toThrow(
                "Failed to consume credits: 402",
            );
        });
    });

    describe("addTopup", () => {
        it("sends POST to /api/credits/topup", async () => {
            const updatedAccount = {
                ...mockAccount,
                topup_credits_available: 25,
            };
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(updatedAccount), { status: 200 }),
            );

            await creditService.addTopup(25);

            expect(fetch).toHaveBeenCalledWith(
                "/api/credits/topup",
                expect.objectContaining({
                    method: "POST",
                    credentials: "include",
                    body: JSON.stringify({ amount: 25 }),
                }),
            );
            expect(creditService.credits()?.topup_credits_available).toBe(25);
        });

        it("throws on non-ok response", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Bad request", { status: 422 }),
            );

            await expect(creditService.addTopup(0)).rejects.toThrow(
                "Failed to add topup: 422",
            );
        });
    });

    describe("changeTier", () => {
        it("sends PUT to /api/credits/tier", async () => {
            const updatedAccount = {
                ...mockAccount,
                tier: "pro",
                tier_credits_available: 500,
            };
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(updatedAccount), { status: 200 }),
            );

            await creditService.changeTier("pro");

            expect(fetch).toHaveBeenCalledWith(
                "/api/credits/tier",
                expect.objectContaining({
                    method: "PUT",
                    credentials: "include",
                    body: JSON.stringify({ tier: "pro" }),
                }),
            );
            expect(creditService.credits()?.tier).toBe("pro");
        });

        it("throws on non-ok response", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Invalid tier", { status: 422 }),
            );

            await expect(
                creditService.changeTier("enterprise"),
            ).rejects.toThrow("Failed to change tier: 422");
        });
    });

    describe("cancelTier", () => {
        it("sends POST to /api/credits/tier/cancel", async () => {
            const cancelledAccount = {
                ...mockAccount,
                tier: "pro",
                tier_status: "cancelled",
                tier_credits_available: 500,
            };
            vi.mocked(fetch).mockResolvedValue(
                new Response(JSON.stringify(cancelledAccount), { status: 200 }),
            );

            await creditService.cancelTier();

            expect(fetch).toHaveBeenCalledWith(
                "/api/credits/tier/cancel",
                expect.objectContaining({
                    method: "POST",
                    credentials: "include",
                }),
            );
            expect(creditService.credits()?.tier_status).toBe("cancelled");
        });

        it("throws on non-ok response", async () => {
            vi.mocked(fetch).mockResolvedValue(
                new Response("Cannot cancel", { status: 409 }),
            );

            await expect(creditService.cancelTier()).rejects.toThrow(
                "Failed to cancel tier: 409",
            );
        });
    });
});
