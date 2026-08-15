<script lang="ts">
import { Mic } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { AUDIO_PATH } from "./audioRouteDefinition.svelte.js";

const t = getT("audio-settings");
const router = getRouterApi();
const isActive = $derived(router.route.pathname === AUDIO_PATH);
</script>

<Sidebar.MenuSubItem>
	<Sidebar.MenuSubButton data-active={isActive || undefined} onclick={() => router.navigate(AUDIO_PATH)}>
		<Mic />
		<span>{t("navLabel", { defaultValue: "Audio" })}</span>
	</Sidebar.MenuSubButton>
</Sidebar.MenuSubItem>
