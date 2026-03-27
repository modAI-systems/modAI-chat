<script lang="ts">
import { getModules } from "../module-system/index";
import { ROUTE_TYPE, type RouteDefinition } from "./routeDefinition.svelte.ts";
import { getCurrentPath, navigate, setHomePath } from "./router.svelte.ts";

const modules = getModules();
const routes = $derived(modules.getAll<RouteDefinition>(ROUTE_TYPE));

const currentPath = $derived(getCurrentPath());
const defaultRoute = $derived(routes.find((r) => r.isDefault) ?? routes[0]);
const activeRoute = $derived(
    routes.find((r) => r.path === currentPath) ?? defaultRoute,
);

$effect(() => {
    if (defaultRoute) {
        setHomePath(defaultRoute.path);
        if (currentPath === "/") {
            navigate(defaultRoute.path);
        }
    }
});
</script>

{#if activeRoute}
	{@const ActiveComponent = activeRoute.component}
	<ActiveComponent />
{/if}
