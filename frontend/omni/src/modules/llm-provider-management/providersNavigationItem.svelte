<script lang="ts">
import { Settings2 } from "lucide-svelte";
import { getAppRouter } from "@/modules/app-layout/AppRouter.svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import { PROVIDERS_PATH } from "./providersRouteDefinition.svelte";

const appRouter = getAppRouter();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton onclick={() => appRouter.navigate(PROVIDERS_PATH)}>
			<Settings2 />
			<span>Providers</span>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
