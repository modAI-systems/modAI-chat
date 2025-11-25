import { Page, expect } from "@playwright/test";

const exact = { exact: true };

export class LLMProvidersPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto("/settings/global/llm-providers");
    }

    async navigateTo() {
        await this.page.getByText("Global Settings", exact).click();
        await this.page.getByText("LLM Providers", exact).click();
        await expect(this.page).toHaveURL("/settings/global/llm-providers");
    }

    async addProvider(name: string, baseUrl: string, apiKey: string) {
        await this.page.getByText("Add Provider", exact).click();
        if (name) await this.page.getByLabel("Provider Name", exact).fill(name);
        if (baseUrl) await this.page.getByLabel("Base URL", exact).fill(baseUrl);
        if (apiKey) await this.page.getByLabel("API Key", exact).fill(apiKey);
        await this.page.getByText("Create Provider", exact).click();
    }

    async assertProviderAddedSuccessfully(providerName: string) {
        await this.assertSuccessfulAddedToast();
        await this.assertProviderExists(providerName);
    }

    async assertSuccessfulAddedToast(): Promise<void> {
        await expect(this.page.getByText("Provider created successfully", exact)).toBeVisible();
    }

    async assertProviderExists(providerName: string, baseUrl?: string) {
        await expect(this.page.getByText(providerName, exact)).toBeVisible();
        if (baseUrl) {
            await this.page.getByText(providerName, exact).click();
            await expect(
                this.page.locator(`input[value="${baseUrl}"]`),
            ).toBeVisible();
        }
    }
}

export class ChatPage {
    constructor(private page: Page) {}

    async navigateTo(): Promise<void> {
        await this.page.getByText("Chat", exact).click();
        await expect(this.page).toHaveURL("/chat");
    }

    async selectProvider(providerName: string): Promise<void> {
        await this.page.getByText(providerName, exact).click();
    }
}
