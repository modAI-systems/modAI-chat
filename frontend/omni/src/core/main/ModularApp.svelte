<script lang="ts">
import ModulesProvider from "../module-system/ModulesProvider.svelte";
import AppRoot from "./AppRoot.svelte";
</script>

<ModulesProvider manifestPath="/modules.json">
	<AppRoot />
</ModulesProvider>
