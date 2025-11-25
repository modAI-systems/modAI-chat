import { test } from "@playwright/test";
import { ChatPage, LLMProvidersPage } from "./pages";

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
        const llmProviderPage = new LLMProvidersPage(page);
        const chatPage = new ChatPage(page);

        // Navigate to LLM Providers page and add a provider
        await llmProviderPage.navigateTo();
        await llmProviderPage.addProvider(
            "Test Provider",
            "http://localhost:3001",
            "test-api-key",
        );

        // Check that LLM Picker has 2 entries (the provider returns 2 models atm)
        await chatPage.navigateTo();
        await chatPage.assertLLMModelCount(2);
    });

    test("not reachable providers don't show up in LLM picker", async ({
        page,
    }) => {
        const llmProviderPage = new LLMProvidersPage(page);
        const chatPage = new ChatPage(page);

        // Add providers
        await llmProviderPage.navigateTo();
        await llmProviderPage.addProvider(
            "Test Provider",
            "http://localhost:3001",
            "test-api-key",
        );
        await llmProviderPage.addProvider(
            "Test Provider2",
            "http://localhost:3099",
            "test-api-key",
        );

        // Check that LLM Picker has 2 entries
        await chatPage.navigateTo();
        await chatPage.assertLLMModelCount(2);
    });
});
