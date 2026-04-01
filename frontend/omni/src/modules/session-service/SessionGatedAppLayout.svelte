<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "@/core/module-system/index";
import type { NoSessionAction, SessionService } from "./index.svelte.js";

const deps = getModuleDeps("@/modules/session-service/SessionGatedAppLayout");
const sessionService = deps.getOne<SessionService>("sessionService");
const noSessionAction = deps.getOne<NoSessionAction>("noSessionAction");
const AppLayoutContent = deps.getOne<Component>("appLayoutContent");

let ready = $state(false);

sessionService.refresh().then(() => {
  if (!sessionService.isSessionActive()) {
    noSessionAction.execute();
  } else {
    ready = true;
  }
});
</script>

{#if ready}
	<AppLayoutContent />
{/if}
