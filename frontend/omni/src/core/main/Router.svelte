<script lang="ts">
import { getModules } from "../module-system/index";
import {
    FALLBACK_ROUTE_TYPE,
    ROUTE_TYPE,
    type RouteDefinition,
} from "./routeDefinition.svelte.ts";
import { getCurrentPath, navigate, setHomePath } from "./router.svelte.ts";

const modules = getModules();
const routes = $derived(modules.getAll<RouteDefinition>(ROUTE_TYPE));
const fallbackRoute = $derived(
    modules.getOne<RouteDefinition>(FALLBACK_ROUTE_TYPE),
);

const currentPath = $derived(getCurrentPath());
const activeRoute = $derived(
    routes.find((r) => r.path === currentPath) ?? fallbackRoute,
);

$effect(() => {
    if (fallbackRoute) {
        setHomePath(fallbackRoute.path);
        if (currentPath === "/") {
            navigate(fallbackRoute.path);
        }
    }
});
</script>

{#if activeRoute}
	{@const ActiveComponent = activeRoute.component}
	<ActiveComponent />
{/if}
