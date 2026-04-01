<script lang="ts">
import { Router } from "sv-router";
import type { Component } from "svelte";
import { getModuleDeps } from "../../core/module-system/index";
import type { AppRouter } from "./AppRouter.svelte.js";

const deps = getModuleDeps("@/modules/app-layout/AppRoot");
const Layout = deps.getOne<Component>("layout");
// Initialize AppRouter module before rendering the Router outlet.
deps.getOne<AppRouter>("appRouter");
</script>

<Layout>
	<Router />
</Layout>


