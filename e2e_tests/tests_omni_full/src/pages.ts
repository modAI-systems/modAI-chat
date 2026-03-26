import { expect, type Page } from "@playwright/test";

/**
 * Sets up an LLM provider via localStorage.
 *
 * The Svelte frontend stores providers client-side. This helper injects
 * them directly without touching the UI, then reloads so the chatbot
 * picks up the new providers on mount.
 */
export class LLMProvidersPage {
    constructor(private page: Page) {}

    async addProvider(name: string, baseUrl: string, _apiKey: string) {
        await this.page.evaluate(
            ({ name, baseUrl }: { name: string; baseUrl: string }) => {
                const KEY = "llm_providers";
                const existing = JSON.parse(
                    localStorage.getItem(KEY) ?? "[]",
                ) as Array<{
                    id: string;
                    name: string;
                    base_url: string;
                    api_key: string;
                }>;
                const newProvider = {
                    id: `provider-${Date.now()}`,
                    name,
                    base_url: baseUrl,
                    api_key: "",
                };
                localStorage.setItem(
                    KEY,
                    JSON.stringify([...existing, newProvider]),
                );
            },
            { name, baseUrl },
        );
        // Reload so the Svelte reactive state picks up the localStorage change
        await this.page.reload();
        // Wait for the auth guard to finish (app becomes visible)
        await this.page.waitForSelector("header", { timeout: 10000 });
    }

    async navigateTo() {
        // Click the Providers nav button in the header
        await this.page
            .getByRole("button", { name: "Providers", exact: true })
            .click();
    }
}

/**
 * Page object for the NanoIDP login page.
 *
 * Automates the OIDC redirect login flow:
 * 1. Navigate to the app (triggers redirect to NanoIDP via backend)
 * 2. Enter username and password
 * 3. Complete login (redirects back to app via /api/auth/callback)
 */
export class NanoIdpLoginPage {
    constructor(private page: Page) {}

    /**
     * Performs a full login flow through NanoIDP's login UI.
     *
     * Navigates to the app root which triggers the OIDC redirect to NanoIDP,
     * fills in the login form, and waits for the redirect back to the app.
     */
    async login(username: string, password: string) {
        // Navigate to app - this triggers redirect to backend /api/auth/login
        // which redirects to NanoIDP authorize endpoint
        await this.page.goto("/");

        // Wait for NanoIDP login page to load (on localhost:9000)
        await this.page.waitForURL(/localhost:9000/, { timeout: 30000 });

        // Fill username and password (single-step form)
        const usernameInput = this.page.locator("#username");
        await usernameInput.waitFor({ state: "visible", timeout: 15000 });
        await usernameInput.fill(username);

        const passwordInput = this.page.locator("#password");
        await passwordInput.waitFor({ state: "visible", timeout: 15000 });
        await passwordInput.fill(password);

        await this.page.getByRole("button", { name: /authorize/i }).click();

        // Wait for backend callback to complete and redirect back to the frontend
        await this.page.waitForURL(/localhost:4173/, { timeout: 30000 });

        // Wait for the Svelte auth guard to finish checking session
        await this.page.waitForSelector("header", { timeout: 15000 });
    }
}

export class ChatPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/");
        // Wait for the Svelte auth guard to finish
        await this.page.waitForSelector("header", { timeout: 10000 });
    }

    async navigateTo(): Promise<void> {
        await this.page
            .getByRole("button", { name: "Chat", exact: true })
            .click();
    }

    async selectFirstModel(): Promise<void> {
        // Open the model selector popover and click the first option
        const modelButton = this.page
            .locator("button")
            .filter({
                hasText: /Select model|gpt-/i,
            })
            .first();
        await expect(modelButton).toBeEnabled({ timeout: 10000 });
        await modelButton.click();
        // Click the first option in the popover/command list
        const firstOption = this.page.locator('[role="option"]').first();
        await firstOption.waitFor({ state: "visible", timeout: 5000 });
        await firstOption.click();
    }

    async sendMessage(message: string): Promise<void> {
        const input = this.page.getByRole("textbox", {
            name: "Type a message...",
        });
        await input.fill(message);
        await this.page.getByRole("button", { name: "Send" }).click();
    }

    async waitForResponse(): Promise<void> {
        // Wait for an assistant message to appear
        await this.page.waitForFunction(
            () => {
                const msgs = document.querySelectorAll(
                    "[data-role='assistant']",
                );
                if (msgs.length > 0) return true;
                // Fallback: look for any non-user message
                const allMsgs = document.querySelectorAll("[data-message]");
                return Array.from(allMsgs).some(
                    (el) => el.getAttribute("data-role") === "assistant",
                );
            },
            { timeout: 15000 },
        );
    }

    async assertResponseExists(): Promise<void> {
        // Verify at least one assistant message is visible
        const assistantMsg = this.page
            .locator("[data-role='assistant']")
            .first();
        await expect(assistantMsg).toBeVisible({ timeout: 15000 });
    }

    async assertModelButtonVisible(modelName: string): Promise<void> {
        await expect(
            this.page.getByRole("button", { name: modelName }),
        ).toBeVisible({ timeout: 10000 });
    }
}
