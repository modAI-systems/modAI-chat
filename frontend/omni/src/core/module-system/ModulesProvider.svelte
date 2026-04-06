<script lang="ts">
import type { Snippet } from "svelte";
import { setContext, untrack } from "svelte";
import { ComponentResolver } from "./componentResolver";
import { MODULES_KEY, type Modules } from "./index";
import { resolveManifestDependencies } from "./manifestDependencyResolver";
import { fetchManifestJson } from "./manifestJson";
import { ActiveModulesImpl } from "./module";

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
        const activeEntries = resolveManifestDependencies(json.modules, []);
        const componentResolver =
            await ComponentResolver.buildUpCache(activeEntries);
        activeModulesImpl = new ActiveModulesImpl(
            activeEntries,
            componentResolver,
        );
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
