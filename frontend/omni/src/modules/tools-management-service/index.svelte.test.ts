import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolService } from "./index.svelte";

describe("toolService", () => {
    let toolService: ToolService;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("./openai.svelte.ts");
        toolService = mod.default;
        toolService.tools = [];
        toolService.selectedToolNames = new Set();
        toolService.loading = false;
        toolService.error = null;
        localStorage.removeItem("selected_tools");
        vi.restoreAllMocks();
    });

    describe("fetchTools", () => {
        it("fetches tools from /api/tools and populates the tools list", async () => {
            const mockTools = {
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "roll_dice",
                            description: "Roll dice and return the results",
                            parameters: { type: "object", properties: {} },
                            strict: true,
                        },
                    },
                ],
            };
            vi.stubGlobal(
                "fetch",
                vi.fn(
                    async () =>
                        new Response(JSON.stringify(mockTools), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        }),
                ),
            );

            await toolService.fetchTools();

            expect(fetch).toHaveBeenCalledWith("/api/tools");
            expect(toolService.tools).toEqual(mockTools.tools);
            expect(toolService.loading).toBe(false);
            expect(toolService.error).toBeNull();
        });

        it("sets error when fetch fails", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn(async () => new Response("", { status: 500 })),
            );

            await toolService.fetchTools();

            expect(toolService.error).toBe("Failed to fetch tools: 500");
            expect(toolService.tools).toEqual([]);
            expect(toolService.loading).toBe(false);
        });

        it("sets error when fetch throws", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn(async () => {
                    throw new Error("Network error");
                }),
            );

            await toolService.fetchTools();

            expect(toolService.error).toBe("Network error");
            expect(toolService.tools).toEqual([]);
        });

        it("prunes selected tools that are no longer available", async () => {
            toolService.selectedToolNames = new Set(["old_tool", "roll_dice"]);
            const mockTools = {
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "roll_dice",
                            description: "Roll dice",
                            parameters: { type: "object", properties: {} },
                        },
                    },
                ],
            };
            vi.stubGlobal(
                "fetch",
                vi.fn(
                    async () =>
                        new Response(JSON.stringify(mockTools), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        }),
                ),
            );

            await toolService.fetchTools();

            expect(toolService.selectedToolNames.has("roll_dice")).toBe(true);
            expect(toolService.selectedToolNames.has("old_tool")).toBe(false);
        });
    });

    describe("toggleTool", () => {
        it("adds a tool to selection when not selected", () => {
            toolService.toggleTool("roll_dice");

            expect(toolService.selectedToolNames.has("roll_dice")).toBe(true);
        });

        it("removes a tool from selection when already selected", () => {
            toolService.selectedToolNames = new Set(["roll_dice"]);

            toolService.toggleTool("roll_dice");

            expect(toolService.selectedToolNames.has("roll_dice")).toBe(false);
        });

        it("persists selection to localStorage", () => {
            toolService.toggleTool("roll_dice");

            const stored = JSON.parse(
                localStorage.getItem("selected_tools") ?? "[]",
            );
            expect(stored).toEqual(["roll_dice"]);
        });
    });

    describe("selectedTools", () => {
        it("returns only tools whose names are in selectedToolNames", () => {
            toolService.tools = [
                {
                    type: "function",
                    function: {
                        name: "roll_dice",
                        description: "Roll dice",
                        parameters: { type: "object", properties: {} },
                    },
                },
                {
                    type: "function",
                    function: {
                        name: "search_web",
                        description: "Search the web",
                        parameters: { type: "object", properties: {} },
                    },
                },
            ];
            toolService.selectedToolNames = new Set(["roll_dice"]);

            expect(toolService.selectedTools).toHaveLength(1);
            expect(toolService.selectedTools[0].function.name).toBe(
                "roll_dice",
            );
        });

        it("returns empty array when nothing selected", () => {
            toolService.tools = [
                {
                    type: "function",
                    function: {
                        name: "roll_dice",
                        description: "Roll dice",
                        parameters: { type: "object", properties: {} },
                    },
                },
            ];
            toolService.selectedToolNames = new Set();

            expect(toolService.selectedTools).toEqual([]);
        });
    });
});
