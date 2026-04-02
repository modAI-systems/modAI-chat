<script lang="ts">
import {
  AppSidebarLayout,
  AppSidebarNavigation,
  type SidebarNavigationItem,
} from "@/lib/components/layout";
import { getAppRouter } from "./AppRouter.svelte";
import type { RouteDefinition } from "./routeDefinition.svelte";

const appRouter = getAppRouter();
const routes = $derived(appRouter.getRoutes() as RouteDefinition[]);
const navigationItems = $derived(
  routes
    .filter(
      (
        route,
      ): route is RouteDefinition & {
        navigation: NonNullable<RouteDefinition["navigation"]>;
      } => route.navigation !== undefined,
    )
    .map(
      (route) =>
        ({
          path: route.path,
          label: route.navigation.label,
          icon: route.navigation.icon,
        }) satisfies SidebarNavigationItem,
    ),
);
const { children } = $props();
</script>

<main class="flex min-h-screen flex-col bg-background">
	{#if navigationItems.length > 0}
		<AppSidebarLayout>
			{#snippet sidebar()}
				<AppSidebarNavigation
					items={navigationItems}
					onNavigate={(path) => appRouter.navigate(appRouter.p(path))}
				/>
			{/snippet}

			{@render children?.()}
		</AppSidebarLayout>
	{:else}
		<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
			<h1 class="text-4xl font-bold text-foreground">modAI</h1>
			<p class="text-muted-foreground">Svelte · Vite · Tailwind · Module System</p>
		</div>
	{/if}
</main>
