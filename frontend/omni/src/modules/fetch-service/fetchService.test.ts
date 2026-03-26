import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Modules } from "@/core/module-system/index";
import {
    NO_SESSION_ACTION_TYPE,
    type NoSessionAction,
    SESSION_SERVICE_TYPE,
    type SessionService,
} from "@/modules/session-service/index.svelte";
import pureFetchService from "./pureFetchService.svelte";
import sessionFetchService from "./sessionFetchService.svelte";

function makeModules(getOne: (type: string) => unknown = () => null): Modules {
    return {
        getOne: vi.fn().mockImplementation(getOne),
        getAll: vi.fn().mockReturnValue([]),
    };
}

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

        const response = await pureFetchService.fetch(
            makeModules(),
            "/api/test",
        );

        expect(fetch).toHaveBeenCalledWith("/api/test", undefined);
        expect(response).toBe(mockResponse);
    });

    it("forwards init options to fetch", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
        const init: RequestInit = { method: "POST", body: "data" };

        await pureFetchService.fetch(makeModules(), "/api/test", init);

        expect(fetch).toHaveBeenCalledWith("/api/test", init);
    });
});

describe("SessionFetchService", () => {
    const mockSessionService: SessionService = {
        refresh: vi.fn(),
        isSessionActive: vi.fn(),
    };
    const mockNoSessionAction: NoSessionAction = {
        execute: vi.fn(),
    };

    function makeSessionModules(sessionActive = false): Modules {
        vi.mocked(mockSessionService.isSessionActive).mockReturnValue(
            sessionActive,
        );
        return makeModules((type) => {
            if (type === SESSION_SERVICE_TYPE) return mockSessionService;
            if (type === NO_SESSION_ACTION_TYPE) return mockNoSessionAction;
            return null;
        });
    }

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        vi.mocked(mockSessionService.refresh).mockResolvedValue(undefined);
        vi.mocked(mockNoSessionAction.execute).mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("returns the response without touching session service on success", async () => {
        const mockResponse = new Response(null, { status: 200 });
        vi.mocked(fetch).mockResolvedValue(mockResponse);

        const response = await sessionFetchService.fetch(
            makeSessionModules(),
            "/api/data",
        );

        expect(response).toBe(mockResponse);
        expect(mockSessionService.refresh).not.toHaveBeenCalled();
    });

    it("does not interact with session service on non-401 error responses", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

        await sessionFetchService.fetch(makeSessionModules(), "/api/data");

        expect(mockSessionService.refresh).not.toHaveBeenCalled();
    });

    it("calls session service refresh on 401", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

        await sessionFetchService.fetch(makeSessionModules(), "/api/data");

        expect(mockSessionService.refresh).toHaveBeenCalledOnce();
    });

    it("executes no-session action when session is inactive after 401", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

        await sessionFetchService.fetch(makeSessionModules(false), "/api/data");

        expect(mockNoSessionAction.execute).toHaveBeenCalledOnce();
    });

    it("does not execute no-session action when session is still active after 401", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

        await sessionFetchService.fetch(makeSessionModules(true), "/api/data");

        expect(mockNoSessionAction.execute).not.toHaveBeenCalled();
    });

    it("includes credentials by default", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

        await sessionFetchService.fetch(makeSessionModules(), "/api/data");

        expect(fetch).toHaveBeenCalledWith(
            "/api/data",
            expect.objectContaining({ credentials: "include" }),
        );
    });

    it("allows caller to override credentials", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

        await sessionFetchService.fetch(makeSessionModules(), "/api/data", {
            credentials: "omit",
        });

        expect(fetch).toHaveBeenCalledWith(
            "/api/data",
            expect.objectContaining({ credentials: "omit" }),
        );
    });

    it("does nothing when session service is not registered", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
        const modules = makeModules(() => null);

        await sessionFetchService.fetch(modules, "/api/data");

        expect(mockNoSessionAction.execute).not.toHaveBeenCalled();
    });
});
