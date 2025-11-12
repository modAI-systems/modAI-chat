import type { LoadedModule, ModuleRegistry } from "./moduleRegistry";

/**
 * Recursively activate modules based on their dependencies.
 *
 * All modules returned have their dependencies met and are active.
 */
export function activateModules(
    moduleRegistry: ModuleRegistry,
): LoadedModule[] {
    const activatedModules: LoadedModule[] = [];
    const activatedIds = new Set<string>();

    function activate(remainingModules: LoadedModule[]): void {
        if (remainingModules.length === 0) {
            return;
        }

        const stillRemaining: LoadedModule[] = [];

        for (const module of remainingModules) {
            const moduleDeps = module.dependencies
                .filter((dep) => dep.startsWith("module:"))
                .map((dep) => dep.substring("module:".length));

            // Check if all module dependencies are already active
            const allDepsMet = moduleDeps.every((depId) =>
                activatedIds.has(depId),
            );

            if (allDepsMet) {
                // Activate this module
                activatedModules.push(module);
                activatedIds.add(module.id);
            } else {
                // Dependencies not met, keep for next iteration
                stillRemaining.push(module);
            }
        }

        // If no progress was made, log problematic modules and stop
        if (stillRemaining.length === remainingModules.length) {
            console.warn(
                "The following modules could not be activated due to unmet dependencies:",
                stillRemaining.map((m) => ({
                    id: m.id,
                    dependencies: m.dependencies,
                    unmetDeps: m.dependencies
                        .filter((dep) => dep.startsWith("module:"))
                        .map((dep) => dep.substring("module:".length))
                        .filter((depId) => !activatedIds.has(depId)),
                })),
            );
        } else {
            // Continue with remaining modules
            activate(stillRemaining);
        }
    }

    activate(moduleRegistry.getAll());
    return activatedModules;
}
