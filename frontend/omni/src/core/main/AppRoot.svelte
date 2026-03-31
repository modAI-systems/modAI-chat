<script lang="ts">
import type { Component } from "svelte";
import { getModules } from "../module-system/index";

const Layout = getModules().getOne<Component>("AppLayout");
</script>

<Layout />
