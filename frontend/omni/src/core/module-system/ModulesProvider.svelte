<script lang="ts">
import type { Snippet } from "svelte";
import { setContext, untrack } from "svelte";
import { ActiveModulesImpl } from "./activeModules";
import { MODULES_KEY, type Modules } from "./index";
import { fetchManifestJson } from "./manifestJson";
import { activateModules } from "./moduleActivator";
import { JsonModuleRegistry } from "./moduleRegistry";

interface Props {
  manifestPath?: string;
  children: Snippet;
}

const { manifestPath = "/modules.json", children }: Props = $props();

// Reactive active modules — starts null until manifest is loaded
let activeModulesImpl = $state<ActiveModulesImpl | null>(null);

// Context object is set synchronously; methods delegate to reactive state
const modules: Modules = {
  getModuleDependencies(path: string) {
    if (!activeModulesImpl) throw new Error("Modules not yet loaded");
    return activeModulesImpl.getModuleDependencies(path);
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

ready.catch((error) => {
  console.error("Failed to load module manifest", {
    manifestPath,
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
		Failed to load modules manifest ({manifestPath}). Check browser console for details.
		{#if error instanceof Error && error.message}
			<br />
			Error: {error.message}
		{/if}
	</div>
{/await}
