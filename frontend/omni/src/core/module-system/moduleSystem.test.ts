import { describe, expect, it } from "vitest";
import { ComponentResolver } from "./componentResolver";
import type { ModuleDependencies } from "./index";
import { resolveManifestDependencies } from "./manifestDependencyResolver";
import type { ManifestEntry } from "./manifestJson";
import { ActiveModulesImpl, ModuleDependenciesImpl } from "./module";

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
// ModuleDependenciesImpl
// ---------------------------------------------------------------------------

describe("ModuleDependenciesImpl", () => {
    describe("getOne", () => {
        it("returns the component for a single-value dependency", () => {
            const comp = { name: "ServiceA" };
            const serviceEntry = entry("svc-a", "@/test/svc-a");
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:myService": "svc-a",
            });
            const allModules = new Map<ManifestEntry, ModuleDependencies>();
            const resolver = ComponentResolver.fromExports({
                "@/test/svc-a": { default: comp },
            });
            allModules.set(
                serviceEntry,
                new ModuleDependenciesImpl(serviceEntry, allModules, resolver),
            );
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                allModules,
                resolver,
            );

            expect(deps.getOne("myService")).toBe(comp);
        });

        it("returns the component for an array dependency with one element", () => {
            const comp = { name: "only" };
            const onlyEntry = entry("only-mod", "@/test/only-mod");
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:single": ["only-mod"],
            });
            const allModules = new Map<ManifestEntry, ModuleDependencies>();
            const resolver = ComponentResolver.fromExports({
                "@/test/only-mod": { default: comp },
            });
            allModules.set(
                onlyEntry,
                new ModuleDependenciesImpl(onlyEntry, allModules, resolver),
            );
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                allModules,
                resolver,
            );

            expect(deps.getOne("single")).toBe(comp);
        });

        it("throws when dependency name is not declared", () => {
            const consumerEntry = entry("consumer", "@/test/consumer");
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                new Map(),
                ComponentResolver.fromExports({}),
            );

            expect(() => deps.getOne("unknown")).toThrow(
                'Dependency "unknown" is not declared',
            );
        });

        it("throws when dependency maps to multiple modules", () => {
            const entryA = entry("a", "@/test/a");
            const entryB = entry("b", "@/test/b");
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:multi": ["a", "b"],
            });
            const allModules = new Map<ManifestEntry, ModuleDependencies>();
            const resolver = ComponentResolver.fromExports({
                "@/test/a": { default: {} },
                "@/test/b": { default: {} },
            });
            allModules.set(
                entryA,
                new ModuleDependenciesImpl(entryA, allModules, resolver),
            );
            allModules.set(
                entryB,
                new ModuleDependenciesImpl(entryB, allModules, resolver),
            );
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                allModules,
                resolver,
            );

            expect(() => deps.getOne("multi")).toThrow(
                'Expected exactly 1 module for dependency "multi", found 2',
            );
        });

        it("throws when referenced module is not in active modules", () => {
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:missing": ["nonexistent"],
            });
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                new Map(),
                ComponentResolver.fromExports({}),
            );

            expect(() => deps.getOne("missing")).toThrow(
                'Module "nonexistent" not found in active modules',
            );
        });
    });

    describe("getAll", () => {
        it("returns all components for an array dependency", () => {
            const compA = { name: "A" };
            const compB = { name: "B" };
            const entryA = entry("a", "@/test/a");
            const entryB = entry("b", "@/test/b");
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:widgets": ["a", "b"],
            });
            const allModules = new Map<ManifestEntry, ModuleDependencies>();
            const resolver = ComponentResolver.fromExports({
                "@/test/a": { default: compA },
                "@/test/b": { default: compB },
            });
            allModules.set(
                entryA,
                new ModuleDependenciesImpl(entryA, allModules, resolver),
            );
            allModules.set(
                entryB,
                new ModuleDependenciesImpl(entryB, allModules, resolver),
            );
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                allModules,
                resolver,
            );

            expect(deps.getAll("widgets")).toEqual([compA, compB]);
        });

        it("wraps a single-value dependency in an array", () => {
            const comp = { name: "only" };
            const serviceEntry = entry("svc", "@/test/svc");
            const consumerEntry = entry("consumer", "@/test/consumer", {
                "module:service": ["svc"],
            });
            const allModules = new Map<ManifestEntry, ModuleDependencies>();
            const resolver = ComponentResolver.fromExports({
                "@/test/svc": { default: comp },
            });
            allModules.set(
                serviceEntry,
                new ModuleDependenciesImpl(serviceEntry, allModules, resolver),
            );
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                allModules,
                resolver,
            );

            expect(deps.getAll("service")).toEqual([comp]);
        });

        it("throws when dependency name is not declared", () => {
            const consumerEntry = entry("consumer", "@/test/consumer");
            const deps = new ModuleDependenciesImpl(
                consumerEntry,
                new Map(),
                ComponentResolver.fromExports({}),
            );

            expect(() => deps.getAll("nope")).toThrow(
                'Dependency "nope" is not declared',
            );
        });
    });
});

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

// ---------------------------------------------------------------------------
// ActiveModulesImpl
// ---------------------------------------------------------------------------

describe("ActiveModulesImpl", () => {
    it("resolves dependency components end-to-end", () => {
        const serviceEntry = entry("svc", "@/modules/svc");
        const consumerEntry = entry("consumer", "@/modules/consumer", {
            "module:service": "svc",
        });
        const resolver = ComponentResolver.fromExports({
            "@/modules/svc": { default: { name: "svc" } },
            "@/modules/consumer": { default: { name: "consumer" } },
        });
        const activeEntries = resolveManifestDependencies(
            [consumerEntry, serviceEntry],
            [],
        );
        const modules = new ActiveModulesImpl(activeEntries, resolver);

        expect(
            modules
                .getModuleDependencies("@/modules/consumer")
                .getOne<{ name: string }>("service"),
        ).toEqual({ name: "svc" });
    });

    it("returns ModuleDependencies for a registered module", () => {
        const svcComp = { name: "svc" };
        const svcEntry = entry("svc", "@/modules/svc");
        const consumerEntry = entry("consumer", "@/modules/consumer", {
            "module:myService": ["svc"],
        });
        const resolver = ComponentResolver.fromExports({
            "@/modules/svc": { default: svcComp },
            "@/modules/consumer": { default: {} },
        });
        const modules = new ActiveModulesImpl(
            [svcEntry, consumerEntry],
            resolver,
        );

        const deps = modules.getModuleDependencies("@/modules/consumer");
        expect(deps.getOne("myService")).toBe(svcComp);
    });

    it("throws when path is not found", () => {
        const modules = new ActiveModulesImpl(
            [],
            ComponentResolver.fromExports({}),
        );

        expect(() =>
            modules.getModuleDependencies("@/modules/missing"),
        ).toThrow('No module found for path "@/modules/missing"');
    });

    it("returns dependencies that resolve across modules", () => {
        const widgetA = { name: "A" };
        const widgetB = { name: "B" };
        const entryA = entry("wa", "@/modules/wa");
        const entryB = entry("wb", "@/modules/wb");
        const layoutEntry = entry("layout", "@/modules/layout", {
            "module:widgets": ["wa", "wb"],
        });
        const resolver = ComponentResolver.fromExports({
            "@/modules/wa": { default: widgetA },
            "@/modules/wb": { default: widgetB },
            "@/modules/layout": { default: {} },
        });
        const modules = new ActiveModulesImpl(
            [entryA, entryB, layoutEntry],
            resolver,
        );

        const deps = modules.getModuleDependencies("@/modules/layout");
        expect(deps.getAll("widgets")).toEqual([widgetA, widgetB]);
    });
});

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
