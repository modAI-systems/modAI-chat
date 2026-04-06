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
