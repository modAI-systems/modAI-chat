import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("window", {
    location: { pathname: "/" },
    addEventListener: vi.fn(),
    history: { pushState: vi.fn() },
});

vi.stubGlobal("history", { pushState: vi.fn() });

describe("router", () => {
    beforeEach(() => {
        vi.resetModules();
        window.location.pathname = "/";
        vi.mocked(history.pushState).mockClear();
    });

    async function loadRouter() {
        return await import("./router.svelte.ts");
    }

    it("initializes currentPath from window.location.pathname", async () => {
        window.location.pathname = "/chat";
        const { getCurrentPath } = await loadRouter();

        expect(getCurrentPath()).toBe("/chat");
    });

    it("defaults to '/' when pathname is empty", async () => {
        window.location.pathname = "";
        const { getCurrentPath } = await loadRouter();

        expect(getCurrentPath()).toBe("/");
    });

    it("navigate updates path and calls pushState", async () => {
        const { navigate, getCurrentPath } = await loadRouter();

        navigate("/tools");

        expect(getCurrentPath()).toBe("/tools");
        expect(history.pushState).toHaveBeenCalledWith(null, "", "/tools");
    });

    it("navigate does nothing when path is the same", async () => {
        window.location.pathname = "/chat";
        const { navigate, getCurrentPath } = await loadRouter();

        navigate("/chat");

        expect(getCurrentPath()).toBe("/chat");
        expect(history.pushState).not.toHaveBeenCalled();
    });

    it("registers a popstate listener", async () => {
        await loadRouter();

        expect(window.addEventListener).toHaveBeenCalledWith(
            "popstate",
            expect.any(Function),
        );
    });

    it("navigateHome navigates to the home path set via setHomePath", async () => {
        const { setHomePath, navigateHome, getCurrentPath } =
            await loadRouter();

        setHomePath("/chat");
        navigateHome();

        expect(getCurrentPath()).toBe("/chat");
        expect(history.pushState).toHaveBeenCalledWith(null, "", "/chat");
    });

    it("navigateHome defaults to / when no home path is set", async () => {
        const { navigateHome } = await loadRouter();

        navigateHome();

        expect(history.pushState).not.toHaveBeenCalled();
    });
});
