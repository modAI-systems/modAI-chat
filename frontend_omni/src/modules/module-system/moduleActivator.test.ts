import { describe, expect, it, vi } from "vitest";
import { activateModules } from "./moduleActivator";
import { ModuleRegistry } from "./moduleRegistry";
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

        const registry = new ModuleRegistry(modules);
        const activeModules = activateModules(registry);

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

        const registry = new ModuleRegistry(modules);
        const activeModules = activateModules(registry);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Neither should be active due to circular dependency
        expect(activeModules.some((m) => m.id === "module-a")).toBe(false);
        expect(activeModules.some((m) => m.id === "module-b")).toBe(false);

        // Verify that unmet dependencies were logged
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            "The following modules could not be activated due to unmet dependencies:",
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

        const registry = new ModuleRegistry(modules);
        const activeModules = activateModules(registry);

        // Both modules should be registered
        expect(registry.getAll().length).toBe(2);

        // Only independent should be active
        expect(activeModules.some((m) => m.id === "independent")).toBe(true);
        expect(activeModules.some((m) => m.id === "dependent")).toBe(false);
    });
});
