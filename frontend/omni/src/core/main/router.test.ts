import type { Component } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("sv-router", () => ({
    createRouter: vi.fn(() => ({
        navigate: mockNavigate,
    })),
}));

const DummyComponent = (() => {}) as unknown as Component;

describe("router", () => {
    beforeEach(() => {
        vi.resetModules();
        mockNavigate.mockClear();
    });

    async function loadRouter() {
        return await import("./router.svelte.ts");
    }

    it("navigate delegates to sv-router after init", async () => {
        const { initRouter, navigate } = await loadRouter();

        initRouter({ "/chat": DummyComponent });
        navigate("/chat");

        expect(mockNavigate).toHaveBeenCalledWith("/chat");
    });

    it("navigateHome navigates to the home path set via setHomePath", async () => {
        const { initRouter, setHomePath, navigateHome } = await loadRouter();

        initRouter({ "/chat": DummyComponent });
        setHomePath("/chat");
        navigateHome();

        expect(mockNavigate).toHaveBeenCalledWith("/chat");
    });

    it("navigateHome defaults to / when no home path is set", async () => {
        const { initRouter, navigateHome } = await loadRouter();

        initRouter({ "/": DummyComponent });
        navigateHome();

        expect(mockNavigate).toHaveBeenCalledWith("/");
    });
});
