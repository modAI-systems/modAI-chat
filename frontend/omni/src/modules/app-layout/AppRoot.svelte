<script lang="ts">
import { getModuleDeps } from "../../core/module-system/index";
import AppRouter, { type RouterService } from "./AppRouter.svelte";

const deps = getModuleDeps("@/modules/app-layout/AppRoot");
const router = deps.getOne<RouterService>("appRouter");
</script>

<AppRouter {router} />


