<script lang="ts">
import { Settings2 } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { PROVIDERS_PATH } from "./providersRouteDefinition.svelte";

const t = getT("llm-provider-management");
const router = getRouterApi();
const isActive = $derived(router.route.pathname === PROVIDERS_PATH);
</script>

<Sidebar.MenuSubItem>
	<Sidebar.MenuSubButton data-active={isActive || undefined} onclick={() => router.navigate(PROVIDERS_PATH)}>
		<Settings2 />
		<span>{t("navLabel", { defaultValue: "Providers" })}</span>
	</Sidebar.MenuSubButton>
</Sidebar.MenuSubItem>
