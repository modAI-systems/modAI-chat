import type { ManifestEntry } from "./manifestJson";

// ---------------------------------------------------------------------------
// Auto-discovery — rspack require.context, lazy mode
// ---------------------------------------------------------------------------

interface RequireContext {
	keys(): string[];
	(key: string): Promise<{ default: unknown }>;
}
declare const require: {
	context: (
		dir: string,
		recursive: boolean,
		filter: RegExp,
		mode: string,
	) => RequireContext;
};

// Scans src/modules/**/*.svelte — every file becomes its own async chunk.
// Manifest paths follow the pattern "@/modules/<path-without-extension>".
const ctx = require.context("../../modules/", true, /\.svelte$/, "lazy");

const componentRegistry: Record<string, () => Promise<unknown>> =
	Object.fromEntries(
		ctx
			.keys()
			.map((key) => [
				key.replace("./", "@/modules/").replace(".svelte", ""),
				() => ctx(key).then((m) => m.default),
			]),
	);

// ---------------------------------------------------------------------------
// LoadedModule + ModuleRegistry
// ---------------------------------------------------------------------------

export class LoadedModule {
	id: string;
	type: string;
	component: unknown;
	dependencies: string[];

	constructor(
		id: string,
		type: string,
		component: unknown,
		dependencies: string[] = [],
	) {
		this.id = id;
		this.type = type;
		this.component = component;
		this.dependencies = dependencies;
	}
}

export interface ModuleRegistry {
	getAll(): Promise<LoadedModule[]>;
}

/**
 * Builds a list of LoadedModules from manifest entries.
 * Each module's JS chunk is fetched lazily via dynamic import.
 */
export class JsonModuleRegistry implements ModuleRegistry {
	private entries: ManifestEntry[];

	constructor(entries: ManifestEntry[]) {
		this.entries = entries;
	}

	async getAll(): Promise<LoadedModule[]> {
		const results = await Promise.all(
			this.entries.map((e) => this.loadModule(e)),
		);
		return results.filter((m): m is LoadedModule => m !== null);
	}

	private async loadModule(entry: ManifestEntry): Promise<LoadedModule | null> {
		const factory = componentRegistry[entry.path];
		if (!factory) {
			console.warn(`Module "${entry.path}" not found in registry`, entry);
			return null;
		}
		const component = await factory();
		return new LoadedModule(
			entry.id,
			entry.type,
			component,
			entry.dependencies ?? [],
		);
	}
}
