import { describe, expect, it, vi } from "vitest";
import { activateModules } from "./moduleActivator";
import { JsonModuleRegistry } from "./moduleRegistry";
import type { ModuleJsonEntry } from "./modulesJson";

// Mock the module registry to avoid importing actual modules with CSS dependencies
vi.mock("../moduleRegistry", () => ({
    moduleRegistry: {
        "@/modules/base": {},
        "@/modules/level1": {},
        "@/modules/level2": {},
        "@/modules/a": {},
        "@/modules/b": {},
        "@/modules/independent": {},
        "@/modules/dependent": {},
        "@/modules/flag-dependent": {},
        "@/modules/multi-flag": {},
        "@/modules/negated-flag": {},
        "@/modules/mixed-flags": {},
    },
}));

describe("Modules - Two-Phase Loading", () => {
    it("should register all modules and activate them recursively based on dependencies", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "base",
                type: "Base",
                path: "@/modules/base",
                dependencies: [],
            },
            {
                id: "level1",
                type: "Level1",
                path: "@/modules/level1",
                dependencies: ["module:base"],
            },
            {
                id: "level2",
                type: "Level2",
                path: "@/modules/level2",
                dependencies: ["module:level1"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeModules = activateModules(registry, []);

        // All modules should be registered
        expect(registry.getAll().length).toBe(3);

        // All modules should be active since dependencies are satisfied
        expect(activeModules.some((m) => m.id === "base")).toBe(true);
        expect(activeModules.some((m) => m.id === "level1")).toBe(true);
        expect(activeModules.some((m) => m.id === "level2")).toBe(true);
    });

    it("should register all modules but not activate circular dependencies", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "module-a",
                type: "TypeA",
                path: "@/modules/a",
                dependencies: ["module:module-b"],
            },
            {
                id: "module-b",
                type: "TypeB",
                path: "@/modules/b",
                dependencies: ["module:module-a"],
            },
        ];

        const consoleWarnSpy = vi
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        const registry = new JsonModuleRegistry(modules);
        const activeModules = activateModules(registry, []);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Neither should be active due to circular dependency
        expect(activeModules.some((m) => m.id === "module-a")).toBe(false);
        expect(activeModules.some((m) => m.id === "module-b")).toBe(false);

        // Verify that unmet dependencies were logged
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            "The following modules could not be activated due to unmet module dependencies:",
            expect.any(Array),
        );

        consoleWarnSpy.mockRestore();
    });

    it("should register all modules and activate only independent ones", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "independent",
                type: "Independent",
                path: "@/modules/independent",
                dependencies: [],
            },
            {
                id: "dependent",
                type: "Dependent",
                path: "@/modules/dependent",
                dependencies: ["module:missing"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeModules = activateModules(registry, []);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Only independent should be active
        expect(activeModules.some((m) => m.id === "independent")).toBe(true);
        expect(activeModules.some((m) => m.id === "dependent")).toBe(false);
    });

    it("should activate modules with flag dependencies when flags are provided", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "base",
                type: "Base",
                path: "@/modules/base",
                dependencies: [],
            },
            {
                id: "flag-dependent",
                type: "FlagDependent",
                path: "@/modules/flag-dependent",
                dependencies: ["flag:foo"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags = ["foo"];
        const activeModules = activateModules(registry, activeFlags);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Both should be active since flag is provided
        expect(activeModules.some((m) => m.id === "base")).toBe(true);
        expect(activeModules.some((m) => m.id === "flag-dependent")).toBe(true);
    });

    it("should not activate modules with unmet flag dependencies", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "base",
                type: "Base",
                path: "@/modules/base",
                dependencies: [],
            },
            {
                id: "flag-dependent",
                type: "FlagDependent",
                path: "@/modules/flag-dependent",
                dependencies: ["flag:foo"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags: string[] = []; // No flags provided
        const activeModules = activateModules(registry, activeFlags);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Only base should be active, flag-dependent should not
        expect(activeModules.some((m) => m.id === "base")).toBe(true);
        expect(activeModules.some((m) => m.id === "flag-dependent")).toBe(
            false,
        );
    });

    it("should activate modules with multiple flag dependencies when all flags are provided", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "multi-flag",
                type: "MultiFlag",
                path: "@/modules/multi-flag",
                dependencies: ["flag:foo", "flag:bar"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags = ["foo", "bar"];
        const activeModules = activateModules(registry, activeFlags);

        // Module should be registered
        expect(registry.getAll().length).toBe(1);

        // Should be active since both flags are provided
        expect(activeModules.some((m) => m.id === "multi-flag")).toBe(true);
    });

    it("should not activate modules with multiple flag dependencies when not all flags are provided", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "multi-flag",
                type: "MultiFlag",
                path: "@/modules/multi-flag",
                dependencies: ["flag:foo", "flag:bar"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags = ["foo"]; // Only one flag provided
        const activeModules = activateModules(registry, activeFlags);

        // Module should be registered
        expect(registry.getAll().length).toBe(1);

        // Should not be active since not all flags are provided
        expect(activeModules.some((m) => m.id === "multi-flag")).toBe(false);
    });

    it("should activate modules with negated flag dependencies when flag is not provided", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "negated-flag",
                type: "NegatedFlag",
                path: "@/modules/negated-flag",
                dependencies: ["flag:!foo"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags: string[] = []; // foo is not provided
        const activeModules = activateModules(registry, activeFlags);

        // Module should be registered
        expect(registry.getAll().length).toBe(1);

        // Should be active since foo is not present
        expect(activeModules.some((m) => m.id === "negated-flag")).toBe(true);
    });

    it("should not activate modules with negated flag dependencies when flag is provided", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "negated-flag",
                type: "NegatedFlag",
                path: "@/modules/negated-flag",
                dependencies: ["flag:!foo"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags = ["foo"]; // foo is provided
        const activeModules = activateModules(registry, activeFlags);

        // Module should be registered
        expect(registry.getAll().length).toBe(1);

        // Should not be active since foo is present
        expect(activeModules.some((m) => m.id === "negated-flag")).toBe(false);
    });

    it("should activate modules with mixed positive and negated flag dependencies", () => {
        const modules: ModuleJsonEntry[] = [
            {
                id: "mixed-flags",
                type: "MixedFlags",
                path: "@/modules/mixed-flags",
                dependencies: ["flag:foo", "flag:!bar"],
            },
        ];

        const registry = new JsonModuleRegistry(modules);
        const activeFlags = ["foo"]; // foo is present, bar is not
        const activeModules = activateModules(registry, activeFlags);

        // Module should be registered
        expect(registry.getAll().length).toBe(1);

        // Should be active since foo is present and bar is not present
        expect(activeModules.some((m) => m.id === "mixed-flags")).toBe(true);
    });
});
