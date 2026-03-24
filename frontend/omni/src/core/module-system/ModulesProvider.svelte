<script lang="ts">
import type { Snippet } from "svelte";
import { setContext, untrack } from "svelte";
import { ActiveModulesImpl, MODULES_KEY, type Modules } from "./index";
import { activateModules } from "./moduleActivator";
import { fetchModuleJson } from "./moduleJson";
import { JsonModuleRegistry } from "./moduleRegistry";

interface Props {
	modulePath?: string;
	children: Snippet;
}

const { modulePath = "/modules.json", children }: Props = $props();

// Reactive active modules — starts null until module JSON is loaded
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

// untrack: module path is intentionally captured once at mount time
const ready = fetchModuleJson(untrack(() => modulePath)).then(async (json) => {
	const registry = new JsonModuleRegistry(json.modules);
	const loaded = await activateModules(registry, []);
	activeModulesImpl = new ActiveModulesImpl(loaded);
});

ready.catch((error) => {
	console.error("Failed to load modules JSON", {
		modulePath,
		error,
	});
});
</script>

{#await ready}
	<!-- Loading modules -->
{:then}
	{@render children()}
{:catch error}
	<div role="alert" data-testid="modules-provider-error">
		Failed to load modules JSON ({modulePath}). Check browser console for details.
		{#if error instanceof Error && error.message}
			<br />
			Error: {error.message}
		{/if}
	</div>
{/await}
