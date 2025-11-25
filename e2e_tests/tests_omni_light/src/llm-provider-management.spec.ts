import { expect, test } from "@playwright/test";
import { ChatPage, LLMProvidersPage } from "./pages";

const exact = { exact: true };

test.describe("LLM Provider Management", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
    });

    test("navigation to llm provider from root page", async ({ page }) => {
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings", exact).click();
        await page.getByText("LLM Providers", exact).click();
        await expect(page.getByText("LLM Provider Management", exact)).toBeVisible();
    });

    test("navigation to llm provider by URL", async ({ page }) => {
        await page.goto("/settings/global/llm-providers");
        await expect(page.getByText("LLM Provider Management", exact)).toBeVisible();
    });

    test("should save llm provider", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);
        const chatPage = new ChatPage(page);

        await llmProviderPage.goto();
        await llmProviderPage.addProvider("Test Provider", "http://localhost:3001", "test-api-key");
        await llmProviderPage.assertProviderAddedSuccessfully("Test Provider");

        await chatPage.navigateTo();
        await llmProviderPage.navigateTo();

        // Assertion
        await llmProviderPage.assertProviderExists("Test Provider", "http://localhost:3001");
    });

    test("should add two providers", async ({ page }) => {
        await page.goto("/settings/global/llm-providers");

        // Add first provider
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Provider One");
        await page.getByLabel("Base URL").fill("http://localhost:3001");
        await page.getByLabel("API Key").fill("key1");
        await page.getByText("Create Provider").click();
        await expect(page.getByText("Add Provider")).toBeVisible();
        await expect(page.getByText("Provider One")).toBeVisible();

        // Add second provider
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Provider Two");
        await page.getByLabel("Base URL").fill("http://localhost:3002");
        await page.getByLabel("API Key").fill("key2");
        await page.getByText("Create Provider").click();
        await expect(page.getByText("Add Provider")).toBeVisible();
        await expect(page.getByText("Provider Two")).toBeVisible();

        // Verify both are there
        await expect(page.getByText("Provider One")).toBeVisible();
        await expect(page.getByText("Provider Two")).toBeVisible();
    });

    test("should not add provider with duplicate name", async ({ page }) => {
        await page.goto("/settings/global/llm-providers");

        // Add first provider
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Duplicate Provider");
        await page.getByLabel("Base URL").fill("http://localhost:3001");
        await page.getByLabel("API Key").fill("key1");
        await page.getByText("Create Provider").click();
        await expect(page.getByText("Add Provider")).toBeVisible();
        await expect(page.getByText("Duplicate Provider")).toBeVisible();

        // Add another with same name (should work in no-backend mode)
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Duplicate Provider");
        await page.getByLabel("Base URL").fill("http://localhost:3002");
        await page.getByLabel("API Key").fill("key2");
        await page.getByText("Create Provider").click();

        // Expect two providers with same name
        await expect(
            page.getByText(
                "Provider with name 'Duplicate Provider' already exists",
            ),
        ).toBeVisible();
    });

    test("should update a provider", async ({ page }) => {
        await page.goto("/settings/global/llm-providers");

        // Add provider
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Update Provider");
        await page.getByLabel("Base URL").fill("http://localhost:3001");
        await page.getByLabel("API Key").fill("key1");
        await page.getByText("Create Provider").click();
        await expect(page.getByText("Add Provider")).toBeVisible();
        await expect(page.getByText("Update Provider")).toBeVisible();

        // Click on the provider to edit
        await page.getByText("Update Provider").click();

        // Modify fields
        await page.getByLabel("Base URL").fill("http://localhost:3003");
        await page.getByLabel("API Key").fill("updated-key");

        // Click update button
        await page.getByText("Save").click();

        // Verify updated - go back and check
        await expect(page.getByText("Add Provider")).toBeVisible();
        await page.getByText("Update Provider").click();
        await expect(
            page.locator('input[value="http://localhost:3003"]'),
        ).toBeVisible();
    });

    test("should delete a provider", async ({ page }) => {
        await page.goto("/settings/global/llm-providers");

        // Add provider
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Delete Provider");
        await page.getByLabel("Base URL").fill("http://localhost:3001");
        await page.getByLabel("API Key").fill("key1");
        await page.getByText("Create Provider").click();
        await expect(page.getByText("Add Provider")).toBeVisible();
        await expect(page.getByText("Delete Provider")).toBeVisible();

        // Click on provider to see delete option
        await page.getByText("Delete Provider").click();

        // Click delete button (the one with trash icon)
        await page
            .locator("button")
            .filter({ has: page.locator(".lucide-trash2") })
            .click();

        // Click the delete button in the confirmation dialog
        await page
            .getByRole("alertdialog")
            .getByText("Delete", { exact: true })
            .click();

        // Verify gone
        await expect(page.getByText("Delete Provider")).not.toBeVisible();
    });
});
