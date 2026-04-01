import { ModuleDependenciesImpl } from "./activeModules";
import type { ModuleDependencies } from "./index";
import type { LoadedModule, ModuleRegistry } from "./moduleRegistry";

type ServiceFactory = (
    deps: ModuleDependencies,
    config: Record<string, unknown>,
) => unknown;

function getReferencedModuleIds(module: LoadedModule): string[] {
    return Object.entries(module.dependencySpec)
        .filter(([key]) => key.startsWith("module:"))
        .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
}

function getUnmetModuleDependencies(
    module: LoadedModule,
    activatedMap: Map<string, LoadedModule>,
): string[] {
    return getReferencedModuleIds(module).filter(
        (depId) => !activatedMap.has(depId),
    );
}

function getUnmetFlagDependencies(
    module: LoadedModule,
    activeFlags: string[],
): string[] {
    return Object.keys(module.dependencySpec)
        .filter((key) => key.startsWith("flag:"))
        .map((key) => {
            const flagPart = key.substring("flag:".length);
            const isNegated = flagPart.startsWith("!");
            const flagName = isNegated ? flagPart.substring(1) : flagPart;
            return { flagName, isNegated, original: key };
        })
        .filter(({ flagName, isNegated }) =>
            isNegated
                ? activeFlags.includes(flagName)
                : !activeFlags.includes(flagName),
        )
        .map(({ original }) => original);
}

/**
 * Recursively resolve and activate modules whose dependencies are met.
 * Supports "module:<localName>" and "flag:[!]<name>" dependency keys.
 * For serviceFactory modules, calls the create function during activation.
 */
export async function activateModules(
    registry: ModuleRegistry,
    activeFlags: string[],
): Promise<LoadedModule[]> {
    const activatedMap = new Map<string, LoadedModule>();

    function activate(remaining: LoadedModule[]): void {
        if (remaining.length === 0) return;

        const stillRemaining: LoadedModule[] = [];

        for (const mod of remaining) {
            const unmetMods = getUnmetModuleDependencies(mod, activatedMap);
            const unmetFlags = getUnmetFlagDependencies(mod, activeFlags);

            if (unmetMods.length === 0 && unmetFlags.length === 0) {
                if (mod.path.endsWith("/create")) {
                    const deps = new ModuleDependenciesImpl(
                        mod.dependencySpec,
                        activatedMap,
                    );
                    const factory = mod.component as ServiceFactory;
                    mod.component = factory(deps, mod.config);
                }
                activatedMap.set(mod.id, mod);
            } else {
                stillRemaining.push(mod);
            }
        }

        // No progress — log and stop to avoid infinite loop
        if (stillRemaining.length === remaining.length) {
            const blocked = stillRemaining.filter(
                (m) => getUnmetModuleDependencies(m, activatedMap).length > 0,
            );
            if (blocked.length > 0) {
                console.warn(
                    "Modules could not be activated due to unmet dependencies:",
                    blocked.map((m) => ({
                        id: m.id,
                        unmet: getUnmetModuleDependencies(m, activatedMap),
                    })),
                );
            }
            return;
        }

        activate(stillRemaining);
    }

    activate(await registry.getAll());
    return Array.from(activatedMap.values());
}
