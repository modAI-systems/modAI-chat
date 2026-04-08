import { describe, expect, it } from "vitest";
import type { OpenAIFunctionTool } from "./index.svelte.js";
import { sortToolsByName } from "./toolName";

describe("sortToolsByName", () => {
    it("sorts tools by plain tool name", () => {
        const tools: OpenAIFunctionTool[] = [
            {
                type: "function",
                name: "zoom",
            },
            {
                type: "function",
                name: "calculate",
            },
            {
                type: "function",
                name: "plain",
            },
        ];

        const sorted = sortToolsByName(tools);

        expect(sorted.map((tool) => tool.name)).toEqual([
            "calculate",
            "plain",
            "zoom",
        ]);
    });
});
