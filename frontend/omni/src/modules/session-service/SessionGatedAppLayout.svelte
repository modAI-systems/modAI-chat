<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "@/core/module-system/index";
import {
  NO_SESSION_ACTION_TYPE,
  type NoSessionAction,
  SESSION_SERVICE_TYPE,
  type SessionService,
} from "./index.svelte.js";

const modules = getModules();
const sessionService = modules.getOne<SessionService>(SESSION_SERVICE_TYPE);
const noSessionAction = modules.getOne<NoSessionAction>(NO_SESSION_ACTION_TYPE);
const AppLayoutContent = modules.getOne<Component>("AppLayoutContent");

let ready = $state(false);

sessionService.refresh(modules).then(() => {
  if (!sessionService.isSessionActive(modules)) {
    noSessionAction.execute(modules);
  } else {
    ready = true;
  }
});
</script>

{#if ready}
	<AppLayoutContent />
{/if}
