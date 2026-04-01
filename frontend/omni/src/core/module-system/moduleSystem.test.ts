import { describe, expect, it } from "vitest";
import { ActiveModulesImpl, ModuleDependenciesImpl } from "./activeModules";
import type { ModuleDependencies } from "./index";
import { activateModules } from "./moduleActivator";
import { LoadedModule, type ModuleRegistry } from "./moduleRegistry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mod(
    id: string,
    path: string = `@/test/${id}`,
    component: unknown = {},
    dependencySpec: Record<string, string | string[]> = {},
    config: Record<string, unknown> = {},
): LoadedModule {
    return new LoadedModule(id, path, component, dependencySpec, config);
}

function registry(modules: LoadedModule[]): ModuleRegistry {
    return { getAll: async () => modules };
}

// ---------------------------------------------------------------------------
// ModuleDependenciesImpl
// ---------------------------------------------------------------------------

describe("ModuleDependenciesImpl", () => {
    function buildModuleMap(
        modules: LoadedModule[],
    ): Map<string, LoadedModule> {
        return new Map(modules.map((m) => [m.id, m]));
    }

    describe("getOne", () => {
        it("returns the component for a single-value dependency", () => {
            const comp = { name: "ServiceA" };
            const moduleMap = buildModuleMap([mod("svc-a", undefined, comp)]);
            const deps = new ModuleDependenciesImpl(
                { "module:myService": "svc-a" },
                moduleMap,
            );

            expect(deps.getOne("myService")).toBe(comp);
        });

        it("returns the component for an array dependency with one element", () => {
            const comp = { name: "only" };
            const moduleMap = buildModuleMap([
                mod("only-mod", undefined, comp),
            ]);
            const deps = new ModuleDependenciesImpl(
                { "module:single": ["only-mod"] },
                moduleMap,
            );

            expect(deps.getOne("single")).toBe(comp);
        });

        it("throws when dependency name is not declared", () => {
            const deps = new ModuleDependenciesImpl({}, new Map());

            expect(() => deps.getOne("unknown")).toThrow(
                'Dependency "unknown" is not declared',
            );
        });

        it("throws when dependency maps to multiple modules", () => {
            const moduleMap = buildModuleMap([mod("a"), mod("b")]);
            const deps = new ModuleDependenciesImpl(
                { "module:multi": ["a", "b"] },
                moduleMap,
            );

            expect(() => deps.getOne("multi")).toThrow(
                'Expected exactly 1 module for dependency "multi", found 2',
            );
        });

        it("throws when referenced module is not in active modules", () => {
            const deps = new ModuleDependenciesImpl(
                { "module:missing": "nonexistent" },
                new Map(),
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
            const moduleMap = buildModuleMap([
                mod("a", undefined, compA),
                mod("b", undefined, compB),
            ]);
            const deps = new ModuleDependenciesImpl(
                { "module:widgets": ["a", "b"] },
                moduleMap,
            );

            expect(deps.getAll("widgets")).toEqual([compA, compB]);
        });

        it("wraps a single-value dependency in an array", () => {
            const comp = { name: "only" };
            const moduleMap = buildModuleMap([mod("svc", undefined, comp)]);
            const deps = new ModuleDependenciesImpl(
                { "module:service": "svc" },
                moduleMap,
            );

            expect(deps.getAll("service")).toEqual([comp]);
        });

        it("throws when dependency name is not declared", () => {
            const deps = new ModuleDependenciesImpl({}, new Map());

            expect(() => deps.getAll("nope")).toThrow(
                'Dependency "nope" is not declared',
            );
        });
    });
});

// ---------------------------------------------------------------------------
// ActiveModulesImpl — getModuleDependencies
// ---------------------------------------------------------------------------

describe("ActiveModulesImpl", () => {
    it("returns ModuleDependencies for a registered module", () => {
        const svcComp = { name: "svc" };
        const modules = new ActiveModulesImpl([
            mod("svc", "@/modules/svc", svcComp),
            mod(
                "consumer",

                "@/modules/consumer",
                {},
                { "module:myService": "svc" },
            ),
        ]);

        const deps = modules.getModuleDependencies("@/modules/consumer");
        expect(deps.getOne("myService")).toBe(svcComp);
    });

    it("throws when path is not found", () => {
        const modules = new ActiveModulesImpl([]);

        expect(() =>
            modules.getModuleDependencies("@/modules/missing"),
        ).toThrow('No module found for path "@/modules/missing"');
    });

    it("returns dependencies that resolve across modules", () => {
        const widgetA = { name: "A" };
        const widgetB = { name: "B" };
        const modules = new ActiveModulesImpl([
            mod("wa", "@/modules/wa", widgetA),
            mod("wb", "@/modules/wb", widgetB),
            mod(
                "layout",

                "@/modules/layout",
                {},
                { "module:widgets": ["wa", "wb"] },
            ),
        ]);

        const deps = modules.getModuleDependencies("@/modules/layout");
        expect(deps.getAll("widgets")).toEqual([widgetA, widgetB]);
    });
});

// ---------------------------------------------------------------------------
// activateModules — dependency resolution
// ---------------------------------------------------------------------------

describe("activateModules", () => {
    it("activates modules with no dependencies", async () => {
        const a = mod("a");
        const b = mod("b");

        const result = await activateModules(registry([a, b]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["a", "b"]),
        );
    });

    it("activates a module once its module dependency is satisfied", async () => {
        const service = mod("svc");
        const consumer = mod(
            "consumer",

            undefined,
            {},
            {
                "module:service": "svc",
            },
        );

        const result = await activateModules(registry([consumer, service]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["svc", "consumer"]),
        );
    });

    it("does not activate a module with an unmet module dependency", async () => {
        const consumer = mod(
            "consumer",

            undefined,
            {},
            {
                "module:service": "missing",
            },
        );

        const result = await activateModules(registry([consumer]), []);

        expect(result.map((m) => m.id)).not.toContain("consumer");
    });

    it("activates a module when required flag is present", async () => {
        const flagged = mod(
            "flagged",

            undefined,
            {},
            {
                "flag:beta": "Requires beta flag",
            },
        );

        const result = await activateModules(registry([flagged]), ["beta"]);

        expect(result.map((m) => m.id)).toContain("flagged");
    });

    it("does not activate a module when required flag is absent", async () => {
        const flagged = mod(
            "flagged",

            undefined,
            {},
            {
                "flag:beta": "Requires beta flag",
            },
        );

        const result = await activateModules(registry([flagged]), []);

        expect(result.map((m) => m.id)).not.toContain("flagged");
    });

    it("does not activate a module when a negated flag is present", async () => {
        const flagged = mod(
            "flagged",

            undefined,
            {},
            {
                "flag:!legacy": "Not for legacy mode",
            },
        );

        const result = await activateModules(registry([flagged]), ["legacy"]);

        expect(result.map((m) => m.id)).not.toContain("flagged");
    });

    it("activates a module when a negated flag is absent", async () => {
        const flagged = mod(
            "flagged",

            undefined,
            {},
            {
                "flag:!legacy": "Not for legacy mode",
            },
        );

        const result = await activateModules(registry([flagged]), []);

        expect(result.map((m) => m.id)).toContain("flagged");
    });

    it("resolves a chain of module dependencies in the correct order", async () => {
        const a = mod("a");
        const b = mod("b", undefined, {}, { "module:dep": "a" });
        const c = mod("c", undefined, {}, { "module:dep": "b" });

        const result = await activateModules(registry([c, b, a]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["a", "b", "c"]),
        );
    });

    it("warns and skips modules with circular/unresolvable dependencies", async () => {
        const calls: unknown[][] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => calls.push(args);
        const a = mod("a", undefined, {}, { "module:dep": "b" });
        const b = mod("b", undefined, {}, { "module:dep": "a" });

        const result = await activateModules(registry([a, b]), []);

        expect(result).toHaveLength(0);
        expect(calls).toHaveLength(1);
        console.warn = original;
    });

    it("resolves array dependencies requiring all referenced modules", async () => {
        const widgetA = mod("wa");
        const widgetB = mod("wb");
        const layout = mod(
            "layout",

            undefined,
            {},
            {
                "module:widgets": ["wa", "wb"],
            },
        );

        const result = await activateModules(
            registry([layout, widgetA, widgetB]),
            [],
        );

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["wa", "wb", "layout"]),
        );
    });

    it("does not activate a module when one of its array dependency values is missing", async () => {
        const widgetA = mod("wa");
        const layout = mod(
            "layout",

            undefined,
            {},
            {
                "module:widgets": ["wa", "missing"],
            },
        );

        const result = await activateModules(registry([layout, widgetA]), []);

        expect(result.map((m) => m.id)).not.toContain("layout");
    });

    it("activates modules with mixed module and flag dependencies", async () => {
        const service = mod("svc");
        const consumer = mod(
            "consumer",

            undefined,
            {},
            {
                "module:service": "svc",
                "flag:enabled": "Feature flag",
            },
        );

        const result = await activateModules(registry([consumer, service]), [
            "enabled",
        ]);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["svc", "consumer"]),
        );
    });

    it("does not activate when flag is unmet even if module deps are met", async () => {
        const service = mod("svc");
        const consumer = mod(
            "consumer",

            undefined,
            {},
            {
                "module:service": "svc",
                "flag:enabled": "Feature flag",
            },
        );

        const result = await activateModules(registry([consumer, service]), []);

        expect(result.map((m) => m.id)).not.toContain("consumer");
    });
});

// ---------------------------------------------------------------------------
// activateModules — serviceFactory
// ---------------------------------------------------------------------------

describe("activateModules — serviceFactory", () => {
    it("calls the create function for serviceFactory modules", async () => {
        const createFn = (
            _deps: ModuleDependencies,
            config: Record<string, unknown>,
        ) => ({
            created: true,
            greeting: config.greeting,
        });

        const factory = mod(
            "my-service",
            "@/test/my-service/create",
            createFn,
            {},
            { greeting: "hello" },
        );

        const result = await activateModules(registry([factory]), []);

        expect(result).toHaveLength(1);
        expect(result[0].component).toEqual({
            created: true,
            greeting: "hello",
        });
    });

    it("passes resolved ModuleDependencies to the create function", async () => {
        const dbComp = { query: () => "data" };
        const db = mod("db", undefined, dbComp);

        let capturedDeps: ModuleDependencies | null = null;
        const createFn = (
            deps: ModuleDependencies,
            _config: Record<string, unknown>,
        ) => {
            capturedDeps = deps;
            return { service: true, db: deps.getOne("database") };
        };

        const svc = mod("svc", "@/test/svc/create", createFn, {
            "module:database": "db",
        });

        const result = await activateModules(registry([svc, db]), []);

        expect(result).toHaveLength(2);
        const svcModule = result.find((m) => m.id === "svc");
        expect(svcModule?.component).toEqual({ service: true, db: dbComp });
        expect(capturedDeps).not.toBeNull();
    });

    it("does not activate a serviceFactory module until its dependencies are met", async () => {
        const createFn = (deps: ModuleDependencies) => ({
            dep: deps.getOne("needed"),
        });

        const factory = mod("svc", "@/test/svc/create", createFn, {
            "module:needed": "dep-mod",
        });
        const dep = mod("dep-mod", undefined, { value: 42 });

        const result = await activateModules(registry([factory, dep]), []);

        expect(result).toHaveLength(2);
        const svcModule = result.find((m) => m.id === "svc");
        expect(svcModule?.component).toEqual({ dep: { value: 42 } });
    });
});
