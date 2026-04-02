<script module lang="ts">
import { createRouter, type RouterApi, type Routes } from "sv-router";
import type { Component } from "svelte";
import { getContext } from "svelte";
import type { ModuleDependencies } from "@/core/module-system";
import type { RouteDefinition } from "./routeDefinition.svelte";

export interface RouterService extends RouterApi<Routes> {
  getRoutes(): RouteDefinition[];
}

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
  const router = createRouter(routeMap) as RouterService;
  router.getRoutes = () => routes;
  return router;
}
</script>

<script lang="ts">
import { Router } from "sv-router";
import { setContext } from "svelte";

const { router }: { router: RouterService } = $props();

setContext(Symbol.for("modai.appRouter"), () => router);
</script>

<Router />
