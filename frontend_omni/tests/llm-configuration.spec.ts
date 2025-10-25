import { expect, test } from "@playwright/test";

test.describe("LLM Picker", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
    });

    test("configured llm providers show up in the LLM picker", async ({
        page,
    }) => {
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

        // Check for any console errors
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                errors.push(msg.text());
            }
        });

        expect(errors).toEqual([]);
        // Check that LLM Picker has 2 entries
        const selectTrigger = page.locator(
            'button:has-text("Select LLM Model")',
        );
        await expect(selectTrigger).toBeEnabled({ timeout: 5000 });

        // Click to open the dropdown
        await selectTrigger.click();

        // Wait for dropdown options to appear
        const options = page.locator('[role="option"]');
        await expect(options).toHaveCount(2);
    });

    test("not reachable providers don't show up in LLM picker", async ({
        page,
    }) => {
        await page.goto("/");

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

        // Fill in the provider form
        await page.getByText("Add Provider").click();
        await page.getByLabel("Provider Name").fill("Test Provider2");
        await page.getByLabel("Base URL").fill("http://localhost:3099");
        await page.getByLabel("API Key").fill("test-api-key");

        // Click "Create Provider" button
        await page.getByText("Create Provider").click();

        // Wait for the provider to be created (toast or form reset)
        await expect(page.getByText("Add Provider")).toBeVisible();

        // Verify the provider was created by checking if it appears in the list
        await expect(page.getByText("Test Provider2")).toBeVisible();

        await page.getByText("Chat").click();
        await expect(page).toHaveURL("/chat");

        // Check for any console errors
        const errors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                errors.push(msg.text());
            }
        });

        expect(errors).toEqual([]);
        // Check that LLM Picker has 2 entries
        const selectTrigger = page.locator(
            'button:has-text("Select LLM Model")',
        );
        await expect(selectTrigger).toBeEnabled({ timeout: 5000 });

        // Click to open the dropdown
        await selectTrigger.click();

        // Wait for dropdown options to appear
        const options = page.locator('[role="option"]');
        await expect(options).toHaveCount(2);
    });
});
