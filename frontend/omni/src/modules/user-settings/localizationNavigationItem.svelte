<script lang="ts">
import { Languages } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { LOCALIZATION_PATH } from "./localizationRouteDefinition.svelte";

const t = getT("user-settings");
const router = getRouterApi();
const isActive = $derived(router.route.pathname === LOCALIZATION_PATH);
</script>

<Sidebar.MenuSubItem>
	<Sidebar.MenuSubButton data-active={isActive || undefined} onclick={() => router.navigate(LOCALIZATION_PATH)}>
		<Languages />
		<span>{t("localizationNavLabel", { defaultValue: "Language & Region" })}</span>
	</Sidebar.MenuSubButton>
</Sidebar.MenuSubItem>
