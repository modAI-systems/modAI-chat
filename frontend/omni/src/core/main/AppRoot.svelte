<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "../module-system/index";

const deps = getModuleDeps("@/core/main/AppRoot");
const AppMain = deps.getOne<Component>("mainApp");
</script>

<AppMain />
