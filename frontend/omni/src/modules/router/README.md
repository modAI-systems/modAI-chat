# Router Module

This folder contains the router-facing types and access API used by feature modules.

## Three Critical Router Concepts

When integrating with the router in modAI, these are the three most important things to get right:

1. **Routes themselves**
	- Feature modules contribute route maps as `Routes` values.
	- Route maps are deep-merged by path key so multiple modules can extend the same branch.

2. **Layout component (most critical, especially at root level)**
	- The root `layout` is the main UI entry point for the app shell.
	- Without a root layout, there is no visible modAI application shell to render feature UI.
	- In this codebase, that root layout is contributed via a route map containing `layout: MainApp`.

3. **Fallbacks**
	- Fallback routes protect navigation for unmatched paths.
	- Use wildcard keys such as `"*"` (and route keys beginning with `"(*"` are also treated as route keys by merge logic).
	- Example: chat contributes `"*": ChatFallbackRedirectRoute` so unknown paths can redirect safely.

## Route Contract

Routes are contributed as `Routes` values (re-exported from `sv-router`):

```ts
export type { Routes } from "sv-router";
```

The router module expects one dependency:

- `routes`: `Routes[]`

`routes` are merged recursively by path key inside the router module before the router is created. This lets multiple modules contribute to the same route branch without having to coordinate a single shared definition.

Example:

```ts
const aboutRoutes: Routes = {
	"/about": {
		"/": About,
		"/work": Work,
		"/team": Team,
		layout: AboutLayout,
	},
};

const rootRoutes: Routes = {
	"/about": About,
};

const nextBarRoutes: Routes = {
	"/next": {
		"/bar": Bar,
	},
};

const nextYoloRoutes: Routes = {
	"/next": {
		"/yolo": Yolo,
	},
};

// Internal router merge result:
// {
//      "/about": About,
//      "/next": {
//          "/bar": Bar,
//          "/yolo": Yolo,
//      },
//    }
```

Nested route branches are deep-merged. Non-branch values such as `layout`, `hooks`, `meta`, or direct route components are replaced by the later map for that same key.

## Accessing Router Functions via Context

Use `getRouterApi()` from `index.svelte.ts` inside a Svelte component to access the typed `sv-router` API from context.

```ts
import { getRouterApi } from "@/modules/router/index.svelte";

const router = getRouterApi();
```

`getRouterApi()` returns `RouterApi<Routes>`, so you can call:

- `router.navigate(...)`
- `router.p(...)`
- `router.isActive(...)`
- `router.preload(...)`
- `router.route` (reactive route data)

## Example: Navigate from a Sidebar Item

```svelte
<script lang="ts">
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";

const router = getRouterApi();

function goToProviders() {
	router.navigate("/providers");
}
</script>

<Sidebar.MenuItem>
	<Sidebar.MenuButton onclick={goToProviders}>
		<span>Providers</span>
	</Sidebar.MenuButton>
</Sidebar.MenuItem>
```

If you need parameter-safe path construction, use:

```ts
router.navigate(router.p("/users/:id", { id: "123" }));
```
