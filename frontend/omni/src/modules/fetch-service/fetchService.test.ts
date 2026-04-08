import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleDependencies } from "@/core/module-system/index";
import type {
    NoSessionAction,
    SessionService,
} from "@/modules/session-service/index.svelte";
import type { FetchService } from "./index.svelte";
import { create as createPureFetchService } from "./pureFetchService.svelte";
import { create as createSessionFetchService } from "./sessionFetchService.svelte";

describe("PureFetchService", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("delegates to global fetch with the given arguments", async () => {
        const mockResponse = new Response("ok", { status: 200 });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const response = await createPureFetchService().fetch("/api/test");

        expect(fetch).toHaveBeenCalledWith("/api/test", undefined);
        expect(response).toBe(mockResponse);
    });

    it("forwards init options to fetch", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
        const init: RequestInit = { method: "POST", body: "data" };

        await createPureFetchService().fetch("/api/test", init);

        expect(fetch).toHaveBeenCalledWith("/api/test", init);
    });
});

describe("SessionFetchService", () => {
    const mockFetchService: FetchService = {
        fetch: vi.fn(),
    };
    const mockSessionService: SessionService = {
        refresh: vi.fn(),
        isSessionActive: vi.fn(),
    };
    const mockNoSessionAction: NoSessionAction = {
        execute: vi.fn(),
    };

    function makeDeps(): ModuleDependencies {
        return {
            getOne: vi.fn().mockImplementation((name: string) => {
                if (name === "fetchService") return mockFetchService;
                if (name === "sessionService") return mockSessionService;
                if (name === "noSessionAction") return mockNoSessionAction;
                throw new Error(`Unknown dep "${name}"`);
            }),
            getAll: vi.fn().mockReturnValue([]),
        };
    }

    function makeService(sessionActive = false) {
        vi.mocked(mockSessionService.isSessionActive).mockReturnValue(
            sessionActive,
        );
        return createSessionFetchService(makeDeps());
    }

    beforeEach(() => {
        vi.mocked(mockSessionService.refresh).mockResolvedValue(undefined);
        vi.mocked(mockNoSessionAction.execute).mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns the response without touching session service on success", async () => {
        const mockResponse = new Response(null, { status: 200 });
        vi.mocked(mockFetchService.fetch).mockResolvedValue(mockResponse);

        const response = await makeService().fetch("/api/data");

        expect(response).toBe(mockResponse);
        expect(mockSessionService.refresh).not.toHaveBeenCalled();
    });

    it("does not interact with session service on non-401 error responses", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 500 }),
        );

        await makeService().fetch("/api/data");

        expect(mockSessionService.refresh).not.toHaveBeenCalled();
    });

    it("calls session service refresh on 401", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 401 }),
        );

        await makeService().fetch("/api/data");

        expect(mockSessionService.refresh).toHaveBeenCalledOnce();
    });

    it("executes no-session action when session is inactive after 401", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 401 }),
        );

        await makeService(false).fetch("/api/data");

        expect(mockNoSessionAction.execute).toHaveBeenCalledOnce();
    });

    it("does not execute no-session action when session is still active after 401", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 401 }),
        );

        await makeService(true).fetch("/api/data");

        expect(mockNoSessionAction.execute).not.toHaveBeenCalled();
    });

    it("delegates fetch call to injected fetch service", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 200 }),
        );
        const init: RequestInit = { method: "POST", body: "data" };

        await makeService().fetch("/api/data", init);

        expect(mockFetchService.fetch).toHaveBeenCalledWith(
            "/api/data",
            expect.objectContaining({
                credentials: "include",
                method: "POST",
                body: "data",
            }),
        );
    });

    it("includes credentials by default", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 200 }),
        );

        await makeService().fetch("/api/data");

        expect(mockFetchService.fetch).toHaveBeenCalledWith(
            "/api/data",
            expect.objectContaining({ credentials: "include" }),
        );
    });

    it("allows caller to override credentials", async () => {
        vi.mocked(mockFetchService.fetch).mockResolvedValue(
            new Response(null, { status: 200 }),
        );

        await makeService().fetch("/api/data", { credentials: "omit" });

        expect(mockFetchService.fetch).toHaveBeenCalledWith(
            "/api/data",
            expect.objectContaining({ credentials: "omit" }),
        );
    });
});
