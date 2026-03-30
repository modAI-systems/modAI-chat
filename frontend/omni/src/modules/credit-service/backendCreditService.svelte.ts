import type {
    ConsumeResult,
    CreditAccount,
    CreditService,
} from "./index.svelte.js";

class BackendCreditService implements CreditService {
    #credits: CreditAccount | null = $state.raw(null);

    async load(): Promise<void> {
        try {
            const response = await fetch("/api/credits", {
                credentials: "include",
            });
            if (response.ok) {
                this.#credits = (await response.json()) as CreditAccount;
            } else {
                this.#credits = null;
            }
        } catch {
            this.#credits = null;
        }
    }

    credits(): CreditAccount | null {
        return this.#credits;
    }

    async consume(amount: number): Promise<ConsumeResult> {
        const response = await fetch("/api/credits/consume", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (!response.ok) {
            throw new Error(`Failed to consume credits: ${response.status}`);
        }
        const result = (await response.json()) as ConsumeResult;
        await this.load();
        return result;
    }

    async addTopup(amount: number): Promise<void> {
        const response = await fetch("/api/credits/topup", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (!response.ok) {
            throw new Error(`Failed to add topup: ${response.status}`);
        }
        this.#credits = (await response.json()) as CreditAccount;
    }

    async changeTier(tier: string): Promise<void> {
        const response = await fetch("/api/credits/tier", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier }),
        });
        if (!response.ok) {
            throw new Error(`Failed to change tier: ${response.status}`);
        }
        this.#credits = (await response.json()) as CreditAccount;
    }

    async cancelTier(): Promise<void> {
        const response = await fetch("/api/credits/tier/cancel", {
            method: "POST",
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error(`Failed to cancel tier: ${response.status}`);
        }
        this.#credits = (await response.json()) as CreditAccount;
    }
}

export default new BackendCreditService();
