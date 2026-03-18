import { expect, test } from "@playwright/test";
import { ChatPage, LLMProvidersPage } from "./pages";

const exact = { exact: true };

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
        // TODO: set url and api key for llmmock in browser local storage so that the provider is available for tests without needing to add it through the UI
        await page.evaluate(() => {
            localStorage.setItem(
                "llmProviderService.providers",
                JSON.stringify([
                    {
                        id: "llmmock",
                        name: "LLMMock",
                        type: "openai",
                        base_url: "http://localhost:3001",
                        api_key: "your-secret-api-key",
                    },
                ]),
            );
        });
    });

    test("Chat responds", async ({ page }) => {
        await page.goto("/");
    });
});
