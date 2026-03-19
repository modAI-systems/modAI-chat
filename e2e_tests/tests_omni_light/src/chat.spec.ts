import { test } from "@playwright/test";
import { ChatPage } from "./pages";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.evaluate(() => {
            localStorage.setItem(
                "llm_providers",
                JSON.stringify([
                    {
                        id: "llmmock",
                        name: "LLMMock",
                        type: "openai",
                        base_url: "http://localhost:3001",
                        api_key: "",
                    },
                ]),
            );
        });
    });

    test("Chat responds", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.goto();
        await chatPage.assertModelButtonVisible("gpt-4o");

        await chatPage.sendMessage("hello");
        await chatPage.assertMessageVisible("hello");
    });
});
