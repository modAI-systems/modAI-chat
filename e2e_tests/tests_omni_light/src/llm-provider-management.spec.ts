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
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.navigateTo();
        await expect(
            page.getByText("LLM Provider Management", exact),
        ).toBeVisible();
    });

    test("navigation to llm provider by URL", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();
        await expect(
            page.getByText("LLM Provider Management", exact),
        ).toBeVisible();
    });

    test("should save llm provider", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);
        const chatPage = new ChatPage(page);

        await llmProviderPage.goto();
        await llmProviderPage.addProvider(
            "Test Provider",
            "http://localhost:3001",
            "test-api-key",
        );
        await llmProviderPage.assertProviderAddedSuccessfully("Test Provider");

        await chatPage.navigateTo();
        await llmProviderPage.navigateTo();

        // Assertion
        await llmProviderPage.assertProviderExists(
            "Test Provider",
            "http://localhost:3001",
        );
    });

    test("should add two providers", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();

        // Add two providers
        await llmProviderPage.addProvider(
            "Provider One",
            "http://localhost:3001",
            "key1",
        );
        await llmProviderPage.addProvider(
            "Provider Two",
            "http://localhost:3002",
            "key2",
        );

        // Verify both are there
        await llmProviderPage.assertProviderExists("Provider One");
        await llmProviderPage.assertProviderExists("Provider Two");
    });

    test("should not add provider with duplicate name", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();

        // Add first provider
        await llmProviderPage.addProvider(
            "Duplicate Provider",
            "http://localhost:3001",
            "key1",
        );
        await llmProviderPage.assertProviderAddedSuccessfully(
            "Duplicate Provider",
        );

        // Add another with same name (should work in no-backend mode)
        await llmProviderPage.addProvider(
            "Duplicate Provider",
            "http://localhost:3002",
            "key2",
        );

        // Expect two providers with same name
        await expect(
            page.getByText(
                "Provider with name 'Duplicate Provider' already exists",
            ),
        ).toBeVisible();
    });

    test("should update a provider", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();

        // Add provider
        await llmProviderPage.addProvider(
            "Update Provider",
            "http://localhost:3001",
            "key1",
        );
        await llmProviderPage.assertProviderAddedSuccessfully(
            "Update Provider",
        );

        // Update provider
        await llmProviderPage.updateProvider(
            "Update Provider",
            undefined,
            "http://localhost:3003",
            "updated-key",
        );

        // Assert
        await llmProviderPage.assertProviderExists(
            "Update Provider",
            "http://localhost:3003",
        );
    });

    test("should delete a provider", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();

        // Add provider
        await llmProviderPage.addProvider(
            "Delete Provider",
            "http://localhost:3001",
            "key1",
        );
        await llmProviderPage.assertProviderAddedSuccessfully(
            "Delete Provider",
        );

        // Delete provider
        await llmProviderPage.deleteProvider("Delete Provider", true);

        // Verify gone
        await llmProviderPage.assertProviderNotExists("Delete Provider");
    });

    test("should not delete if confirmation dialog cancelled", async ({
        page,
    }) => {
        const llmProviderPage = new LLMProvidersPage(page);

        await llmProviderPage.goto();

        // Add provider
        await llmProviderPage.addProvider(
            "Cancel Delete Provider",
            "http://localhost:3001",
            "key1",
        );
        await llmProviderPage.assertProviderAddedSuccessfully(
            "Cancel Delete Provider",
        );

        // Try to delete but cancel
        await llmProviderPage.deleteProvider("Cancel Delete Provider", false);

        // Verify still exists
        await llmProviderPage.assertProviderExists("Cancel Delete Provider");
    });
});
