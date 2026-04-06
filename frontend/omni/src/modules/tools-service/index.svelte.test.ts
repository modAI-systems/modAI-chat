import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import { ModaiBackendToolsService } from "./modaiBackendToolsService.svelte";

describe("ModaiBackendToolsService", () => {
    let fetchService: FetchService;
    let service: ModaiBackendToolsService;

    beforeEach(() => {
        localStorage.clear();
        fetchService = {
            fetch: vi.fn(),
        };
        service = new ModaiBackendToolsService(fetchService);
    });

    it("returns available tools from /api/tools", async () => {
        const tools = [
            {
                type: "function" as const,
                function: {
                    name: "calculate",
                    description: "Evaluate a math expression",
                    parameters: {
                        type: "object",
                        properties: {
                            expression: { type: "string" },
                        },
                    },
                },
            },
        ];
        vi.mocked(fetchService.fetch).mockResolvedValue(
            new Response(JSON.stringify({ tools }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );

        const result = await service.fetchAvailableTools();

        expect(fetchService.fetch).toHaveBeenCalledWith("/api/tools");
        expect(result).toEqual(tools);
    });

    it("returns empty list when /api/tools is unavailable", async () => {
        vi.mocked(fetchService.fetch).mockResolvedValue(
            new Response("", { status: 503 }),
        );

        const result = await service.fetchAvailableTools();

        expect(result).toEqual([]);
    });
});
