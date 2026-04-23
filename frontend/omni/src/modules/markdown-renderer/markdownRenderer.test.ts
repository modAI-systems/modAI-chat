import { describe, expect, it } from "vitest";
import { katexRenderer } from "./katexRenderer.svelte.js";
import { markedRenderer } from "./markedRenderer.svelte.js";

describe("katexRenderer", () => {
    it("renders display math $$...$$ to KaTeX HTML", () => {
        const result = katexRenderer.render("$$E = mc^2$$");
        expect(result).toContain("katex-display");
        expect(result).not.toContain("$$");
    });

    it("renders inline math $...$ to KaTeX HTML", () => {
        const result = katexRenderer.render("Formula: $E = mc^2$ is famous.");
        expect(result).toContain("katex");
        expect(result).not.toContain("$E");
    });

    it("leaves text without math delimiters unchanged", () => {
        const input = "Hello **world**!";
        expect(katexRenderer.render(input)).toBe(input);
    });

    it("does not cross newlines for inline math", () => {
        const input = "$start\nend$";
        expect(katexRenderer.render(input)).toBe(input);
    });
});

describe("markedRenderer", () => {
    it("converts markdown to HTML", () => {
        const result = markedRenderer.render("**bold** and *italic*");
        expect(result).toContain("<strong>bold</strong>");
        expect(result).toContain("<em>italic</em>");
    });

    it("preserves allowlisted KaTeX HTML from katexRenderer output", () => {
        const katexHtml = katexRenderer.render("$x^2$");
        const result = markedRenderer.render(katexHtml);
        expect(result).toContain("katex");
        expect(result).toContain("katex-mathml");
    });
    it("strips dangerous attributes and script tags from raw HTML", () => {
        const result = markedRenderer.render(
            '<img src="x" onerror="alert(1)"><script>alert(1)</script>',
        );
        expect(result).not.toContain("onerror");
        expect(result).not.toContain("<script>");
    });
});

describe("katexRenderer + markedRenderer pipeline", () => {
    it("renders a document with both markdown and display math", () => {
        const input = "## Title\n\n$$E = mc^2$$\n\nSome **text**.";
        const afterKatex = katexRenderer.render(input);
        const result = markedRenderer.render(afterKatex);
        expect(result).toContain("<h2>Title</h2>");
        expect(result).toContain("katex-display");
        expect(result).toContain("<strong>text</strong>");
    });

    it("renders inline math mixed with markdown", () => {
        const input = "The formula $E = mc^2$ is **important**.";
        const afterKatex = katexRenderer.render(input);
        const result = markedRenderer.render(afterKatex);
        expect(result).toContain("katex");
        expect(result).toContain("<strong>important</strong>");
    });

    it("renders underbrace formula correctly", () => {
        const input = "$$\\underbrace{0.084}_{\\text{Vol.}} \\times 2400$$";
        const afterKatex = katexRenderer.render(input);
        const result = markedRenderer.render(afterKatex);
        expect(result).toContain("katex-display");
        expect(result).toContain("0.084");
    });
});
