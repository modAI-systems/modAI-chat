import { describe, expect, it } from "vitest";
import { ComponentResolver } from "./componentResolver";
import type { ModuleDependencies } from "./index";
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

const stubDeps: ModuleDependencies = {
    getOne<T>(): T {
        return undefined as unknown as T;
    },
    getAll<T>(): T[] {
        return [];
    },
};

// ---------------------------------------------------------------------------
// ComponentResolver
// ---------------------------------------------------------------------------

describe("ComponentResolver", () => {
    it("buildUpCache only caches paths of referenced dependencies", async () => {
        let importCalls = 0;
        const component = { name: "Widget" };
        const widgetEntry = entry("widget", "@/modules/widget/Widget", {});
        const consumerEntry = entry("consumer", "@/modules/consumer", {
            "module:widget": "widget",
        });
        const resolver = await ComponentResolver.buildUpCache(
            [widgetEntry, consumerEntry],
            {
                "@/modules/widget/Widget": async () => {
                    importCalls += 1;
                    return { default: component };
                },
            },
        );

        expect(importCalls).toBe(1);
        expect(resolver.getComponent("@/modules/widget/Widget", stubDeps)).toBe(
            component,
        );
    });

    it("buildUpCache does not cache unreferenced entries", async () => {
        let importCalls = 0;
        const unreferencedEntry = entry(
            "unreferenced",
            "@/modules/unused/Widget",
        );
        const consumerEntry = entry("consumer", "@/modules/consumer", {});
        await ComponentResolver.buildUpCache(
            [unreferencedEntry, consumerEntry],
            {
                "@/modules/unused/Widget": async () => {
                    importCalls += 1;
                    return { default: {} };
                },
            },
        );

        expect(importCalls).toBe(0);
    });

    it("buildUpCache fetches factory base path (strips /create) for referenced entries", async () => {
        let importCalls = 0;
        const svcEntry = entry("svc", "@/modules/svc/create");
        const consumerEntry = entry("consumer", "@/modules/consumer", {
            "module:service": "svc",
        });
        const resolver = await ComponentResolver.buildUpCache(
            [svcEntry, consumerEntry],
            {
                "@/modules/svc": async () => {
                    importCalls += 1;
                    return { create: () => ({ ready: true }) };
                },
            },
        );

        expect(importCalls).toBe(1);
        expect(resolver.getComponent("@/modules/svc/create", stubDeps)).toEqual(
            { ready: true },
        );
    });

    it("buildUpCache deduplicates referenced paths when multiple entries reference the same dependency", async () => {
        let importCalls = 0;
        const widgetEntry = entry("widget", "@/modules/shared");
        const consumer1 = entry("c1", "@/modules/c1", {
            "module:widget": "widget",
        });
        const consumer2 = entry("c2", "@/modules/c2", {
            "module:widget": "widget",
        });
        await ComponentResolver.buildUpCache(
            [widgetEntry, consumer1, consumer2],
            {
                "@/modules/shared": async () => {
                    importCalls += 1;
                    return { default: {} };
                },
            },
        );

        expect(importCalls).toBe(1);
    });

    it("getComponent returns default export for regular module", () => {
        const comp = { name: "Comp" };
        const resolver = ComponentResolver.fromExports({
            "@/test/comp": { default: comp },
        });

        expect(resolver.getComponent("@/test/comp", stubDeps)).toBe(comp);
    });

    it("getComponent calls create() fresh on each call for factory paths", () => {
        let callCount = 0;
        const resolver = ComponentResolver.fromExports({
            "@/test/svc": {
                create: (
                    _deps: ModuleDependencies,
                    config: Record<string, unknown>,
                ) => {
                    callCount += 1;
                    return { callCount, config };
                },
            },
        });

        const first = resolver.getComponent("@/test/svc/create", stubDeps, {
            x: 1,
        });
        const second = resolver.getComponent("@/test/svc/create", stubDeps, {
            x: 2,
        });

        expect(callCount).toBe(2);
        expect(first).toEqual({ callCount: 1, config: { x: 1 } });
        expect(second).toEqual({ callCount: 2, config: { x: 2 } });
    });

    it("getComponent passes deps to create()", () => {
        const service = { name: "my-service" };
        const deps: ModuleDependencies = {
            getOne<T>(): T {
                return service as unknown as T;
            },
            getAll<T>(): T[] {
                return [];
            },
        };
        const resolver = ComponentResolver.fromExports({
            "@/test/consumer": {
                create: (d: ModuleDependencies) => ({
                    svc: d.getOne("anything"),
                }),
            },
        });

        expect(resolver.getComponent("@/test/consumer/create", deps)).toEqual({
            svc: service,
        });
    });

    it("getComponent returns null when the path is not in cache", () => {
        const resolver = ComponentResolver.fromExports({});

        expect(resolver.getComponent("@/test/missing", stubDeps)).toBeNull();
    });

    it("getComponent warns and returns null when factory has no create export", () => {
        const warns: unknown[][] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => warns.push(args);

        const resolver = ComponentResolver.fromExports({
            "@/test/bad": { default: {} },
        });
        const result = resolver.getComponent("@/test/bad/create", stubDeps);

        console.warn = original;

        expect(result).toBeNull();
        expect(warns).toHaveLength(1);
    });
});
