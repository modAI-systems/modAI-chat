import type { LoadedModule, ModuleRegistry } from "./moduleRegistry";

export function getUnmetModuleDependencies(
    module: LoadedModule,
    activatedModulesMap: Map<string, LoadedModule>,
): string[] {
    const moduleDeps = module.dependencies
        .filter((dep) => dep.startsWith("module:"))
        .map((dep) => dep.substring("module:".length));

    const unmetModuleDeps = moduleDeps
        .filter((depId) => !activatedModulesMap.has(depId))
        .map((depId) => `module:${depId}`);

    return unmetModuleDeps;
}

export function getUnmetFlagDependencies(
    module: LoadedModule,
    activeFlags: string[],
): string[] {
    const flagDeps = module.dependencies
        .filter((dep) => dep.startsWith("flag:"))
        .map((dep) => {
            const flagPart = dep.substring("flag:".length);
            const isNegated = flagPart.startsWith("!");
            const flagName = isNegated ? flagPart.substring(1) : flagPart;
            return { flagName, isNegated, original: dep };
        });

    const unmetFlagDeps = flagDeps
        .filter(({ flagName, isNegated }) =>
            isNegated
                ? activeFlags.includes(flagName)
                : !activeFlags.includes(flagName),
        )
        .map(({ original }) => original);

    return unmetFlagDeps;
}

/**
 * Recursively activate modules based on their dependencies.
 *
 * All modules returned have their dependencies met and are active.
 */
export function activateModules(
    moduleRegistry: ModuleRegistry,
    activeFlags: string[],
): LoadedModule[] {
    function activate(
        remainingModules: LoadedModule[],
        activatedModulesMap: Map<string, LoadedModule>,
    ): void {
        if (remainingModules.length === 0) {
            return;
        }

        const stillRemaining: LoadedModule[] = [];

        for (const module of remainingModules) {
            const unmetModuleDeps = getUnmetModuleDependencies(
                module,
                activatedModulesMap,
            );
            const unmetFlagDeps = getUnmetFlagDependencies(module, activeFlags);
            const allDepsMet =
                unmetModuleDeps.length === 0 && unmetFlagDeps.length === 0;

            if (allDepsMet) {
                // Activate this module
                activatedModulesMap.set(module.id, module);
            } else {
                // Dependencies not met, keep for next iteration
                stillRemaining.push(module);
            }
        }

        // If no progress was made, check for modules with unmet module dependencies and log them
        if (stillRemaining.length === remainingModules.length) {
            const problematicModules = stillRemaining.filter(
                (m) =>
                    getUnmetModuleDependencies(m, activatedModulesMap).length >
                    0,
            );
            if (problematicModules.length > 0) {
                console.warn(
                    "The following modules could not be activated due to unmet module dependencies:",
                    problematicModules.map((m) => ({
                        id: m.id,
                        dependencies: m.dependencies,
                        unmetDeps: getUnmetModuleDependencies(
                            m,
                            activatedModulesMap,
                        ),
                    })),
                );
            }
        } else {
            // Continue with remaining modules
            activate(stillRemaining, activatedModulesMap);
        }
    }

    const activatedModulesMap = new Map<string, LoadedModule>();
    activate(moduleRegistry.getAll(), activatedModulesMap);
    return Array.from(activatedModulesMap.values());
}
