<script lang="ts">
import CreditCoinsIcon from "@lucide/svelte/icons/coins";
import { getCreditService } from "@/modules/credit-service/index.svelte.js";
import { Badge } from "$lib/components/ui/badge/index.js";
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
const totalAvailable = $derived(
    account
        ? account.tier_credits_available + account.topup_credits_available
        : 0,
);
const totalCostEur = $derived(
    account ? account.tier_cost_eur + account.topup_cost_eur : 0,
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
				<div class="flex flex-col gap-1.5 px-2 py-1 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Tier</span>
						<div class="flex items-center gap-1">
							<Badge variant="secondary" class="capitalize">{account.tier}</Badge>
							{#if account.tier_status === "cancelled"}
								<Badge variant="destructive" class="text-xs">Cancelled</Badge>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Available</span>
						<span class="font-medium">{totalAvailable}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Tier: {account.tier_credits_available}</span>
						<span>Top-up: {account.topup_credits_available}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Cost</span>
						<span>{totalCostEur.toFixed(2)} EUR</span>
					</div>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarGroupContent>
</SidebarGroup>
{/if}
