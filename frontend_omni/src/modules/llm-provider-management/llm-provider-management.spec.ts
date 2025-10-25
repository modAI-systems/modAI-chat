import { expect, test } from "@playwright/test";

test.describe("LLM Provider Management", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
    });

    test("should save llm provider", async ({ page }) => {
        // Navigate to LLM Providers page
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();
        await page.getByText("Add Provider").click();

        // Fill in the provider form
        await page.getByLabel("Provider Name").fill("Test Provider");
        await page.getByLabel("Base URL").fill("http://localhost:3001");
        await page.getByLabel("API Key").fill("test-api-key");

        // Click "Create Provider" button
        await page.getByText("Create Provider").click();

        // Wait for the provider to be created (toast or form reset)
        await expect(page.getByText("Add Provider")).toBeVisible();

        // Verify the provider was created by checking if it appears in the list
        await expect(page.getByText("Test Provider")).toBeVisible();

        await page.getByText("Chat").click();
        await expect(page).toHaveURL("/chat");
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();

        await expect(page.getByText("Test Provider")).toBeVisible();
        await page.getByText("Test Provider").click();
        await expect(
            page.locator('input[value="http://localhost:3001"]'),
        ).toBeVisible();
    });
});
