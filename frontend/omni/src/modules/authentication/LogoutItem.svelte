<script lang="ts">
import { LogOut } from "lucide-svelte";
import { getModuleDeps } from "@/core/module-system";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import { getT } from "@/modules/i18n/index.svelte.js";
import { SIDEBAR_MENU_BUTTON_CLASS } from "@/modules/main-app-sidebar-based/lib/styles";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";

const t = getT("authentication");

const deps = getModuleDeps("@/modules/authentication/LogoutItem");
const fetchService = deps.getOne<FetchService>("fetchService");

async function logout() {
    const csrfRes = await fetchService.fetch("/api/auth/csrf");
    if (!csrfRes.ok) {
        window.location.href = "/";
        return;
    }
    const { csrf_token } = await csrfRes.json();
    const logoutRes = await fetchService.fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf_token },
    });
    if (logoutRes.ok) {
        const { redirect_url } = await logoutRes.json();
        window.location.href = redirect_url ?? "/";
        return;
    }
    window.location.href = "/";
}
</script>

<Sidebar.MenuItem>
    <Sidebar.MenuButton
        class={SIDEBAR_MENU_BUTTON_CLASS}
        onclick={logout}
    >
        <LogOut />
        <span>{t("logoutLabel", { defaultValue: "Logout" })}</span>
    </Sidebar.MenuButton>
</Sidebar.MenuItem>
