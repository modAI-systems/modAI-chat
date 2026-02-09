import { expect, type Page } from "@playwright/test";

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
        if (baseUrl)
            await this.page.getByLabel("Base URL", exact).fill(baseUrl);
        if (apiKey) await this.page.getByLabel("API Key", exact).fill(apiKey);
        await this.page.getByText("Create Provider", exact).click();
    }

    async assertProviderAddedSuccessfully(providerName: string) {
        await this.assertSuccessfulAddedToast();
        await this.assertProviderExists(providerName);
    }

    async assertSuccessfulAddedToast(): Promise<void> {
        // waitForSelector also works if there are multiple toasts
        await this.page.waitForSelector('text="Provider created successfully"');
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

    async updateProvider(
        providerName: string,
        newName?: string,
        baseUrl?: string,
        apiKey?: string,
    ) {
        await this.page.getByText(providerName, exact).click();
        if (newName)
            await this.page.getByLabel("Provider Name", exact).fill(newName);
        if (baseUrl)
            await this.page.getByLabel("Base URL", exact).fill(baseUrl);
        if (apiKey) await this.page.getByLabel("API Key", exact).fill(apiKey);
        await this.page.getByText("Save", exact).click();
    }

    async deleteProvider(providerName: string, confirm: boolean = true) {
        // Find the provider card and click the delete button within it
        const providerCard = this.page
            .locator("div")
            .filter({ hasText: providerName })
            .first();
        await providerCard
            .locator("button")
            .filter({ has: this.page.locator(".lucide-trash2") })
            .click();
        if (confirm) {
            await this.page
                .getByRole("alertdialog")
                .getByText("Yes", { exact: true })
                .click();
        } else {
            await this.page
                .getByRole("alertdialog")
                .getByText("No", { exact: true })
                .click();
        }
    }

    async assertProviderNotExists(providerName: string) {
        await expect(
            this.page.getByText(providerName, exact),
        ).not.toBeVisible();
    }
}

export class LoginPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto("/login");
    }

    async login(email: string, password: string) {
        await this.page.getByLabel("Email", exact).fill(email);
        await this.page.getByLabel("Password", exact).fill(password);
        await this.page.getByRole("button", { name: "Login" }).click();
        // After login, user is redirected to /chat or / depending on the app configuration
        await expect(this.page).not.toHaveURL("/login");
    }
}

export class SignupPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto("/register");
    }

    async signupUser(email: string, password: string, fullName?: string) {
        if (fullName) {
            await this.page
                .getByLabel("Full Name (Optional)", exact)
                .fill(fullName);
        }
        await this.page.getByLabel("Email", exact).fill(email);
        await this.page.getByLabel("Password", exact).fill(password);
        await this.page.getByRole("button", { name: "Create Account" }).click();
    }
}

export class ChatPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/chat");
    }

    async navigateTo(): Promise<void> {
        await this.page.getByText("Chat", exact).click();
        await expect(this.page).toHaveURL("/chat");
    }

    async selectProvider(providerName: string): Promise<void> {
        await this.page.getByText(providerName, exact).click();
    }

    async getLLMModelCount(): Promise<number> {
        const selectTrigger = this.page.locator(
            'button:has-text("Select LLM Model")',
        );
        await expect(selectTrigger).toBeEnabled({ timeout: 5000 });
        await selectTrigger.click();
        const options = this.page.locator('[role="option"]');
        const count = await options.count();
        // Close the dropdown by pressing Escape
        await this.page.keyboard.press("Escape");
        return count;
    }

    async assertLLMModelCount(expectedCount: number): Promise<void> {
        const count = await this.getLLMModelCount();
        expect(count).toBe(expectedCount);
    }

    async selectFirstModel(): Promise<void> {
        const selectTrigger = this.page.locator(
            'button:has-text("Select LLM Model")',
        );
        await expect(selectTrigger).toBeEnabled({ timeout: 5000 });
        await selectTrigger.click();
        const firstOption = this.page.locator('[role="option"]').first();
        await firstOption.click();
    }

    async sendMessage(message: string): Promise<void> {
        const input = this.page.getByPlaceholder(
            "What would you like to know?",
        );
        await input.fill(message);
        await input.press("Enter");
    }

    async waitForResponse(): Promise<void> {
        // Wait for the assistant message to appear
        await this.page.waitForSelector(".is-assistant", { timeout: 10000 });
    }

    async assertResponseExists(): Promise<void> {
        await expect(this.page.locator(".is-assistant")).toBeVisible();
    }
}
