<script lang="ts">
import type { Component } from "svelte";
import { getModuleDeps } from "../../core/module-system/index";

const Layout = getModuleDeps("@/modules/app-layout/AppRoot").getOne<Component>(
  "layout",
);
</script>

<Layout />
