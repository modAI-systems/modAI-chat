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
            "http://localhost:3001/v1",
            "your-secret-api-key",
        );

        // Check that LLM Picker has 3 entries (llmock returns 3 models: gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
        await chatPage.navigateTo();
        await chatPage.assertLLMModelCount(3);
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
            "http://localhost:3001/v1",
            "your-secret-api-key",
        );
        await llmProviderPage.addProvider(
            "Test Provider2",
            "http://localhost:3099",
            "your-secret-api-key",
        );

        // Check that LLM Picker has 3 entries (only the working provider's models)
        await chatPage.navigateTo();
        await chatPage.assertLLMModelCount(3);
    });
});
