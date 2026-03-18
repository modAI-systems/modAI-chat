<script lang="ts">
import type { Snippet } from "svelte";
import { setContext, untrack } from "svelte";
import { ActiveModulesImpl, MODULES_KEY, type Modules } from "./index";
import { fetchManifestJson } from "./manifestJson";
import { activateModules } from "./moduleActivator";
import { JsonModuleRegistry } from "./moduleRegistry";

interface Props {
	manifestPath?: string;
	children: Snippet;
}

const { manifestPath = "/manifest.json", children }: Props = $props();

// Reactive active modules — starts null until manifest is loaded
let activeModulesImpl = $state<ActiveModulesImpl | null>(null);

// Context object is set synchronously; methods delegate to reactive state
const modules: Modules = {
	getOne<T>(type: string): T | null {
		return activeModulesImpl?.getOne<T>(type) ?? null;
	},
	getAll<T>(type: string): T[] {
		return activeModulesImpl?.getAll<T>(type) ?? [];
	},
};

setContext(MODULES_KEY, modules);

// untrack: manifest path is intentionally captured once at mount time
const ready = fetchManifestJson(untrack(() => manifestPath)).then(
	async (json) => {
		const registry = new JsonModuleRegistry(json.modules);
		const loaded = await activateModules(registry, []);
		activeModulesImpl = new ActiveModulesImpl(loaded);
	},
);
</script>

{#await ready}
	<!-- Loading modules -->
{:then}
	{@render children()}
{/await}
