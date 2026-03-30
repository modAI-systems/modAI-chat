<script lang="ts">
import { getUserService } from "@/modules/user-service/index.svelte.js";
import NavUser from "$lib/components/nav-user.svelte";

const userService = getUserService();

$effect(() => {
    userService.load();
});

const user = $derived(userService.user());
</script>

{#if user}
    <NavUser user={{ name: user.full_name ?? user.email, email: user.email }} onlogout={() => userService.logout()} />
{/if}
