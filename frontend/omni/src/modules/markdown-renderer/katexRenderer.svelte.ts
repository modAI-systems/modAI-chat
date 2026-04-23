import "katex/dist/katex.min.css";
import katex from "katex";
import type { MarkdownRenderer } from "./index.svelte.js";

const DISPLAY_REGEX = /\$\$([\s\S]+?)\$\$/g;
const INLINE_REGEX = /\$([^\n$]+?)\$/g;

export function create(): MarkdownRenderer {
    return katexRenderer;
}

export const katexRenderer: MarkdownRenderer = {
    render(text: string): string {
        return text
            .replace(DISPLAY_REGEX, (_, math) =>
                katex.renderToString(math.trim(), {
                    displayMode: true,
                    throwOnError: false,
                }),
            )
            .replace(INLINE_REGEX, (_, math) =>
                katex.renderToString(math.trim(), {
                    displayMode: false,
                    throwOnError: false,
                }),
            );
    },
};
