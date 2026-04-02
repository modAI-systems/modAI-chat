<script module lang="ts">
import { createRouter } from "sv-router";
import type { Component } from "svelte";
import { getContext } from "svelte";
import type { ModuleDependencies } from "@/core/module-system";
import type { RouteDefinition } from "./routeDefinition.svelte";

export type RouterService = ReturnType<typeof createRouter>;

export function getAppRouter(): RouterService {
  return getContext<() => RouterService>(Symbol.for("modai.appRouter"))();
}

export function create(deps: ModuleDependencies): RouterService {
  const routes = deps.getAll<RouteDefinition>("routes");
  const fallbackRoute = deps.getOne<RouteDefinition>("fallbackRoute");
  const layout = deps.getOne<Component>("layout");
  const routeMap: Record<string, RouteDefinition["component"]> & {
    layout: Component;
  } = {
    layout,
  };

  for (const routeDef of routes) {
    routeMap[routeDef.path] = routeDef.component;
  }

  routeMap["*"] = fallbackRoute.component;
  return createRouter(routeMap);
}
</script>

<script lang="ts">
import { Router } from "sv-router";
import { setContext } from "svelte";

const { router }: { router: RouterService } = $props();

setContext(Symbol.for("modai.appRouter"), () => router);
</script>

<Router />