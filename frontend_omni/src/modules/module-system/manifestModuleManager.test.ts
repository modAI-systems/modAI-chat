import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManifestModuleManager, LoadedModule } from "./manifestModuleManager";
import type {
    ModuleManifest,
    ModuleManifestEntry,
} from "./moduleManifestLoader";

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

// Test subclass that allows us to control module loading
class TestableManifestModuleManager extends ManifestModuleManager {
    protected loadModule(manifestEntry: ModuleManifestEntry) {
        return new LoadedModule(
            manifestEntry.id,
            manifestEntry.type,
            {},
            manifestEntry.dependencies || [],
        );
    }
}

describe("ManifestModuleManager - Two-Phase Loading", () => {
    let manager: TestableManifestModuleManager;

    beforeEach(() => {
        manager = new TestableManifestModuleManager();
    });

    it("should register all modules and activate them recursively based on dependencies", async () => {
        const manifest: ModuleManifest = {
            version: "1.0.0",
            modules: [
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
            ],
        };

        await manager.loadModulesFromManifestAsync(manifest);

        const registeredModules = manager.getRegisteredModules();
        const activeModules = manager.getActiveModules();

        // All modules should be registered
        expect(registeredModules.has("base")).toBe(true);
        expect(registeredModules.has("level1")).toBe(true);
        expect(registeredModules.has("level2")).toBe(true);

        // All modules should be active since dependencies are satisfied
        expect(activeModules.has("base")).toBe(true);
        expect(activeModules.has("level1")).toBe(true);
        expect(activeModules.has("level2")).toBe(true);
    });

    it("should register all modules but not activate circular dependencies", async () => {
        const manifest: ModuleManifest = {
            version: "1.0.0",
            modules: [
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
            ],
        };

        const consoleWarnSpy = vi
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        await manager.loadModulesFromManifestAsync(manifest);

        const registeredModules = manager.getRegisteredModules();
        const activeModules = manager.getActiveModules();

        // Both modules should be registered
        expect(registeredModules.has("module-a")).toBe(true);
        expect(registeredModules.has("module-b")).toBe(true);

        // Neither should be active due to circular dependency
        expect(activeModules.has("module-a")).toBe(false);
        expect(activeModules.has("module-b")).toBe(false);

        // Verify that unmet dependencies were logged
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            "The following modules could not be activated due to unmet dependencies:",
            expect.any(Array),
        );

        consoleWarnSpy.mockRestore();
    });

    it("should register all modules and activate only independent ones", async () => {
        const manifest: ModuleManifest = {
            version: "1.0.0",
            modules: [
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
            ],
        };

        await manager.loadModulesFromManifestAsync(manifest);

        const registeredModules = manager.getRegisteredModules();
        const activeModules = manager.getActiveModules();

        // Both modules should be registered
        expect(registeredModules.has("independent")).toBe(true);
        expect(registeredModules.has("dependent")).toBe(true);

        // Only independent should be active
        expect(activeModules.has("independent")).toBe(true);
        expect(activeModules.has("dependent")).toBe(false);
    });
});
