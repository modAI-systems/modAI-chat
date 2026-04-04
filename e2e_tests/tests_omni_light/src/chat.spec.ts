import { test } from "@playwright/test";
import { ChatPage } from "./pages";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/chat");
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
        await page.goto("/chat");
        await page
            .getByText("How can I help you today?")
            .waitFor({ state: "visible", timeout: 20000 });
    });

    test("Chat responds", async ({ page }) => {
        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        await chatPage.sendMessage("hello");
        await chatPage.assertLastResponse("hello");
    });

    test("Chat handles multiple messages", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        await chatPage.sendMessage("hello");
        await chatPage.assertLastResponse("hello");

        await chatPage.sendMessage("world");
        await chatPage.assertLastResponse("world");
    });
});
