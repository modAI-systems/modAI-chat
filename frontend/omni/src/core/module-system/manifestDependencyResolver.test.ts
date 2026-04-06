import { describe, expect, it } from "vitest";
import { resolveManifestDependencies } from "./manifestDependencyResolver";
import type { ManifestEntry } from "./manifestJson";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entry(
    id: string,
    path: string = `@/test/${id}`,
    dependencies: Record<string, string | string[]> = {},
    config: Record<string, unknown> = {},
): ManifestEntry {
    return { id, path, dependencies, config };
}

// ---------------------------------------------------------------------------
// resolveManifestDependencies
// ---------------------------------------------------------------------------

describe("resolveManifestDependencies", () => {
    it("activates modules with no dependencies", () => {
        const a = entry("a");
        const b = entry("b");

        const result = resolveManifestDependencies([a, b], []);

        expect(result.map((e) => e.id)).toEqual(
            expect.arrayContaining(["a", "b"]),
        );
    });

    it("activates a module once its module dependency is satisfied", () => {
        const service = entry("svc");
        const consumer = entry("consumer", "@/test/consumer", {
            "module:service": "svc",
        });

        const result = resolveManifestDependencies([consumer, service], []);

        expect(result.map((e) => e.id)).toEqual(
            expect.arrayContaining(["svc", "consumer"]),
        );
    });

    it("does not activate a module with an unmet module dependency", () => {
        const consumer = entry("consumer", "@/test/consumer", {
            "module:service": "missing",
        });

        const result = resolveManifestDependencies([consumer], []);

        expect(result.map((e) => e.id)).not.toContain("consumer");
    });

    it("activates a module when required flag is present", () => {
        const flagged = entry("flagged", "@/test/flagged", {
            "flag:beta": "Requires beta flag",
        });

        const result = resolveManifestDependencies([flagged], ["beta"]);

        expect(result.map((e) => e.id)).toContain("flagged");
    });

    it("does not activate a module when required flag is absent", () => {
        const flagged = entry("flagged", "@/test/flagged", {
            "flag:beta": "Requires beta flag",
        });

        const result = resolveManifestDependencies([flagged], []);

        expect(result.map((e) => e.id)).not.toContain("flagged");
    });

    it("does not activate a module when a negated flag is present", () => {
        const flagged = entry("flagged", "@/test/flagged", {
            "flag:!legacy": "Notforlegacymode",
        });

        const result = resolveManifestDependencies([flagged], ["legacy"]);

        expect(result.map((e) => e.id)).not.toContain("flagged");
    });

    it("activates a module when a negated flag is absent", () => {
        const flagged = entry("flagged", "@/test/flagged", {
            "flag:!legacy": "Notforlegacymode",
        });

        const result = resolveManifestDependencies([flagged], []);

        expect(result.map((e) => e.id)).toContain("flagged");
    });

    it("resolves a chain of module dependencies in the correct order", () => {
        const a = entry("a");
        const b = entry("b", "@/test/b", { "module:dep": "a" });
        const c = entry("c", "@/test/c", { "module:dep": "b" });

        const result = resolveManifestDependencies([c, b, a], []);

        expect(result.map((e) => e.id)).toEqual(
            expect.arrayContaining(["a", "b", "c"]),
        );
    });

    it("warns and skips modules with circular/unresolvable dependencies", () => {
        const calls: unknown[][] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => calls.push(args);
        const a = entry("a", "@/test/a", { "module:dep": "b" });
        const b = entry("b", "@/test/b", { "module:dep": "a" });

        const result = resolveManifestDependencies([a, b], []);

        expect(result.length).toBe(0);
        expect(calls).toHaveLength(1);
        console.warn = original;
    });

    it("resolves array dependencies requiring all referenced modules", () => {
        const widgetA = entry("wa");
        const widgetB = entry("wb");
        const layout = entry("layout", "@/test/layout", {
            "module:widgets": ["wa", "wb"],
        });

        const result = resolveManifestDependencies(
            [layout, widgetA, widgetB],
            [],
        );

        expect(result.map((e) => e.id)).toEqual(
            expect.arrayContaining(["wa", "wb", "layout"]),
        );
    });

    it("does not activate a module when one of its array dependency values is missing", () => {
        const widgetA = entry("wa");
        const layout = entry("layout", "@/test/layout", {
            "module:widgets": ["wa", "missing"],
        });

        const result = resolveManifestDependencies([layout, widgetA], []);

        expect(result.map((e) => e.id)).not.toContain("layout");
    });

    it("activates modules with mixed module and flag dependencies", () => {
        const service = entry("svc");
        const consumer = entry("consumer", "@/test/consumer", {
            "module:service": "svc",
            "flag:enabled": "Feature flag",
        });

        const result = resolveManifestDependencies(
            [consumer, service],
            ["enabled"],
        );

        expect(result.map((e) => e.id)).toEqual(
            expect.arrayContaining(["svc", "consumer"]),
        );
    });

    it("does not activate when flag is unmet even if module deps are met", () => {
        const service = entry("svc");
        const consumer = entry("consumer", "@/test/consumer", {
            "module:service": "svc",
            "flag:enabled": "Feature flag",
        });

        const result = resolveManifestDependencies([consumer, service], []);

        expect(result.map((e) => e.id)).not.toContain("consumer");
    });

    it("returns entries in activation order (dependencies before dependants)", () => {
        const a = entry("a");
        const b = entry("b", "@/test/b", { "module:dep": "a" });

        const result = resolveManifestDependencies([b, a], []);

        expect(result.map((e) => e.id)).toEqual(["a", "b"]);
    });
});
