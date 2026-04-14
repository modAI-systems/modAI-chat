<script lang="ts">
import { getModuleDeps } from "@/core/module-system";
import { getT } from "@/modules/i18n/index.svelte.js";
import type {
    SessionService,
    UserInfo,
} from "@/modules/session-service/index.svelte.js";
import * as Avatar from "$lib/shadcnui/components/ui/avatar/index.js";

const t = getT("user-avatar");

const deps = getModuleDeps("@/modules/user-avatar/UserAvatarItem");
const sessionService = deps.getOne<SessionService>("sessionService");

let userInfo = $state<UserInfo | null>(null);
sessionService.getActiveSession().then((result) => {
    userInfo = result.userInfo;
});

const displayName = $derived(userInfo?.name ?? userInfo?.user_id ?? "");
const initials = $derived(
    displayName
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
);
</script>

<div class="flex items-center gap-3 px-1 py-1">
    <Avatar.Root>
        <Avatar.Fallback aria-label={t("userAvatarLabel", { defaultValue: "User avatar" })}>
            {initials || "?"}
        </Avatar.Fallback>
    </Avatar.Root>
    <span class="truncate text-sm font-medium text-sidebar-foreground">
        {displayName}
    </span>
</div>
