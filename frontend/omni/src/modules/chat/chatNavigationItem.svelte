<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import { getAppRouter } from "@/modules/app-layout/AppRouter.svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";

const appRouter = getAppRouter();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton onclick={() => appRouter.navigate(CHAT_PATH)}>
			<MessageSquare />
			<span>Chat</span>
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>
