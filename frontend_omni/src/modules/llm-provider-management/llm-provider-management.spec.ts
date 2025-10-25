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

    test("should add two providers", async ({ page }) => {
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();

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
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();

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
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();

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
        await expect(page).toHaveTitle(/modAI/);
        await page.getByText("Global Settings").click();
        await page.getByText("LLM Providers").click();

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
