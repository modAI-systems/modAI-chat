import DOMPurify from "dompurify";
import { marked } from "marked";
import type { MarkdownRenderer } from "./index.svelte.js";

export function create(): MarkdownRenderer {
    return markedRenderer;
}

export const markedRenderer: MarkdownRenderer = {
    render(text: string): string {
        const html = marked.parse(text, { async: false }) as string;
        return String(DOMPurify.sanitize(html));
    },
};
