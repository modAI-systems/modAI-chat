<script lang="ts">
import { createRouter, Router } from "sv-router";
import { setContext } from "svelte";
import { getModuleDeps } from "@/core/module-system";
import type { Routes } from "@/modules/router/index.svelte";
import { mergeRouteMaps } from "@/modules/router/utils";

const deps = getModuleDeps("@/modules/router/AppRouter");
const allRoutes = deps.getAll<Routes>("routes");
const mergedRoutes = mergeRouteMaps(allRoutes);
const router = createRouter(mergedRoutes);

setContext(Symbol.for("modai.router"), () => router);
</script>

<Router />
