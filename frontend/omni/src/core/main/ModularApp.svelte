<script lang="ts">
import AppRoot from "../../modules/app-layout/AppRoot.svelte";
import ModulesProvider from "../module-system/ModulesProvider.svelte";
</script>

<ModulesProvider manifestPath="/modules.json">
	<AppRoot />
</ModulesProvider>
