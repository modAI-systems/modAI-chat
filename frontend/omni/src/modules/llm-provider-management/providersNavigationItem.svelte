<script lang="ts">
import { Settings2 } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { SIDEBAR_MENU_BUTTON_CLASS } from "@/modules/main-app-sidebar-based/lib/styles";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { PROVIDERS_PATH } from "./providersRouteDefinition.svelte";

const t = getT("llm-provider-management");
const router = getRouterApi();
</script>

<Sidebar.MenuItem>
	<Sidebar.MenuButton
		isActive={false}
		class={SIDEBAR_MENU_BUTTON_CLASS}
		onclick={() => router.navigate(PROVIDERS_PATH)}
	>
		<Settings2 />
		<span>{t("navLabel", { defaultValue: "Providers" })}</span>
	</Sidebar.MenuButton>
</Sidebar.MenuItem>
