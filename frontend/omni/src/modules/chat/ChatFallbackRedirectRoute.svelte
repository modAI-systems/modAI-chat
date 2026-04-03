<script lang="ts">
import { onMount } from "svelte";
import { getRouterApi } from "@/modules/router/index.svelte";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";

const router = getRouterApi();

onMount(() => {
  router.navigate(CHAT_PATH);
});
</script>
