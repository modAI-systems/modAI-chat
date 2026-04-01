<script lang="ts">
import CreditCoinsIcon from "@lucide/svelte/icons/coins";
import { getCreditService } from "@/modules/credit-service/index.svelte.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Progress } from "$lib/components/ui/progress/index.js";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
} from "$lib/components/ui/sidebar/index.js";

const creditService = getCreditService();

$effect(() => {
    creditService.load();
});

const account = $derived(creditService.credits());
const tierCreditsUsed = $derived(
    account
        ? Math.round(account.tier_cost_eur * account.euro_to_credit_ratio)
        : 0,
);
const topupCreditsUsed = $derived(
    account
        ? Math.round(account.topup_cost_eur * account.euro_to_credit_ratio)
        : 0,
);
</script>

{#if account}
<SidebarGroup>
	<SidebarGroupLabel>
		<CreditCoinsIcon class="mr-1 size-4" />
		Credits
	</SidebarGroupLabel>
	<SidebarGroupContent>
		<SidebarMenu>
			<SidebarMenuItem>
				<div class="flex flex-col gap-2 px-2 py-1 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Tier</span>
						<div class="flex items-center gap-1">
							<Badge variant="secondary" class="capitalize">{account.tier}</Badge>
							{#if account.tier_status === "cancelled"}
								<Badge variant="destructive" class="text-xs">Cancelled</Badge>
							{/if}
						</div>
					</div>
					<div class="flex flex-col gap-1">
						<div class="flex items-center justify-between text-xs">
							<span class="text-muted-foreground">Tier credits</span>
							<span class="tabular-nums">{tierCreditsUsed} / {account.tier_credit_limit} used</span>
						</div>
						<Progress
							value={tierCreditsUsed}
							max={account.tier_credit_limit}
						/>
					</div>
					{#if account.topup_credit_limit > 0}
						<div class="flex flex-col gap-1">
							<div class="flex items-center justify-between text-xs">
								<span class="text-muted-foreground">Top-up credits</span>
								<span class="tabular-nums">{topupCreditsUsed} / {account.topup_credit_limit} used</span>
							</div>
							<Progress
								value={topupCreditsUsed}
								max={account.topup_credit_limit}
							/>
						</div>
					{/if}
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarGroupContent>
</SidebarGroup>
{/if}
