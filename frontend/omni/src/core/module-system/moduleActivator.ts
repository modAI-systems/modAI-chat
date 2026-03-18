import type { LoadedModule, ModuleRegistry } from "./moduleRegistry";

function getUnmetModuleDependencies(
	module: LoadedModule,
	activatedMap: Map<string, LoadedModule>,
): string[] {
	return module.dependencies
		.filter((dep) => dep.startsWith("module:"))
		.map((dep) => dep.substring("module:".length))
		.filter((depId) => !activatedMap.has(depId))
		.map((depId) => `module:${depId}`);
}

function getUnmetFlagDependencies(
	module: LoadedModule,
	activeFlags: string[],
): string[] {
	return module.dependencies
		.filter((dep) => dep.startsWith("flag:"))
		.map((dep) => {
			const flagPart = dep.substring("flag:".length);
			const isNegated = flagPart.startsWith("!");
			const flagName = isNegated ? flagPart.substring(1) : flagPart;
			return { flagName, isNegated, original: dep };
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
 * Supports "module:<id>" and "flag:[!]<name>" dependency prefixes.
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
