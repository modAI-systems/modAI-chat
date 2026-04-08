import type { OpenAIFunctionTool } from "./index.svelte.js";

export function sortToolsByName(
    tools: OpenAIFunctionTool[],
): OpenAIFunctionTool[] {
    return [...tools].sort((left, right) =>
        left.name.localeCompare(right.name, "und", {
            sensitivity: "base",
        }),
    );
}
