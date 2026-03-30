import { getModules } from "@/core/module-system/index.js";

export const CREDIT_SERVICE_TYPE = "CreditService";

export interface CreditAccount {
    user_id: string;
    tier: string;
    tier_status: string;
    tier_credits_available: number;
    tier_cost_eur: number;
    topup_credits_available: number;
    topup_cost_eur: number;
    period_start: string;
}

export interface ConsumeResult {
    success: boolean;
    tier_credits_available: number;
    topup_credits_available: number;
}

/**
 * Manages credit account operations against the backend.
 * Call load() to fetch the current account, then read credits() reactively.
 */
export interface CreditService {
    load(): Promise<void>;
    credits(): CreditAccount | null;
    consume(amount: number): Promise<ConsumeResult>;
    addTopup(amount: number): Promise<void>;
    changeTier(tier: string): Promise<void>;
    cancelTier(): Promise<void>;
}

/**
 * Returns the active CreditService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getCreditService(): CreditService {
    const service = getModules().getOne<CreditService>(CREDIT_SERVICE_TYPE);
    if (!service) {
        throw new Error("CreditService module not registered");
    }
    return service;
}
