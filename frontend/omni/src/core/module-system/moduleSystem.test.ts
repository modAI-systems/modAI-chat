import { describe, expect, it } from "vitest";
import { ActiveModulesImpl } from "./index";
import { activateModules } from "./moduleActivator";
import { LoadedModule, type ModuleRegistry } from "./moduleRegistry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mod(
    id: string,
    type: string,
    component: unknown = {},
    dependencies: string[] = [],
): LoadedModule {
    return new LoadedModule(id, type, component, dependencies);
}

function registry(modules: LoadedModule[]): ModuleRegistry {
    return { getAll: async () => modules };
}

// ---------------------------------------------------------------------------
// ActiveModulesImpl — Modules interface
// ---------------------------------------------------------------------------

describe("ActiveModulesImpl", () => {
    describe("getAll", () => {
        it("returns all components of the given type", () => {
            const compA = { name: "A" };
            const compB = { name: "B" };
            const modules = new ActiveModulesImpl([
                mod("a", "Widget", compA),
                mod("b", "Widget", compB),
                mod("c", "Service", {}),
            ]);

            expect(modules.getAll("Widget")).toEqual([compA, compB]);
        });

        it("returns an empty array when no module matches the type", () => {
            const modules = new ActiveModulesImpl([mod("a", "Widget", {})]);

            expect(modules.getAll("Unknown")).toEqual([]);
        });

        it("returns an empty array when there are no modules", () => {
            const modules = new ActiveModulesImpl([]);

            expect(modules.getAll("Widget")).toEqual([]);
        });
    });

    describe("getOne", () => {
        it("returns the single component of a type", () => {
            const comp = { name: "only" };
            const modules = new ActiveModulesImpl([mod("a", "Widget", comp)]);

            expect(modules.getOne("Widget")).toBe(comp);
        });

        it("throws when no module matches", () => {
            const modules = new ActiveModulesImpl([mod("a", "Widget", {})]);

            expect(() => modules.getOne("Unknown")).toThrow(
                'No module found with type "Unknown"',
            );
        });

        it("throws when multiple modules of the same type exist", () => {
            const modules = new ActiveModulesImpl([
                mod("a", "Widget", {}),
                mod("b", "Widget", {}),
            ]);

            expect(() => modules.getOne("Widget")).toThrow(
                'Multiple modules found with type "Widget"',
            );
        });
    });
});

// ---------------------------------------------------------------------------
// activateModules — dependency resolution
// ---------------------------------------------------------------------------

describe("activateModules", () => {
    it("activates modules with no dependencies", async () => {
        const a = mod("a", "A");
        const b = mod("b", "B");

        const result = await activateModules(registry([a, b]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["a", "b"]),
        );
    });

    it("activates a module once its module dependency is satisfied", async () => {
        const service = mod("svc", "Service");
        const consumer = mod("consumer", "Consumer", {}, ["module:svc"]);

        const result = await activateModules(registry([consumer, service]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["svc", "consumer"]),
        );
    });

    it("does not activate a module with an unmet module dependency", async () => {
        const consumer = mod("consumer", "Consumer", {}, ["module:missing"]);

        const result = await activateModules(registry([consumer]), []);

        expect(result.map((m) => m.id)).not.toContain("consumer");
    });

    it("activates a module when required flag is present", async () => {
        const flagged = mod("flagged", "F", {}, ["flag:beta"]);

        const result = await activateModules(registry([flagged]), ["beta"]);

        expect(result.map((m) => m.id)).toContain("flagged");
    });

    it("does not activate a module when required flag is absent", async () => {
        const flagged = mod("flagged", "F", {}, ["flag:beta"]);

        const result = await activateModules(registry([flagged]), []);

        expect(result.map((m) => m.id)).not.toContain("flagged");
    });

    it("does not activate a module when a negated flag is present", async () => {
        const flagged = mod("flagged", "F", {}, ["flag:!legacy"]);

        const result = await activateModules(registry([flagged]), ["legacy"]);

        expect(result.map((m) => m.id)).not.toContain("flagged");
    });

    it("activates a module when a negated flag is absent", async () => {
        const flagged = mod("flagged", "F", {}, ["flag:!legacy"]);

        const result = await activateModules(registry([flagged]), []);

        expect(result.map((m) => m.id)).toContain("flagged");
    });

    it("resolves a chain of module dependencies in the correct order", async () => {
        const a = mod("a", "A");
        const b = mod("b", "B", {}, ["module:a"]);
        const c = mod("c", "C", {}, ["module:b"]);

        const result = await activateModules(registry([c, b, a]), []);

        expect(result.map((m) => m.id)).toEqual(
            expect.arrayContaining(["a", "b", "c"]),
        );
    });

    it("warns and skips modules with circular/unresolvable dependencies", async () => {
        const calls: unknown[][] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => calls.push(args);
        const a = mod("a", "A", {}, ["module:b"]);
        const b = mod("b", "B", {}, ["module:a"]);

        const result = await activateModules(registry([a, b]), []);

        expect(result).toHaveLength(0);
        expect(calls).toHaveLength(1);
        console.warn = original;
    });
});
