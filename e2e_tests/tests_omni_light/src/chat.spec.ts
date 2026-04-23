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

    test("Wide markdown response fits within the chat bubble", async ({
        page,
    }) => {
        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        // Send a message that will be echoed back as a wide markdown table.
        // llmock mirrors the input, so this table becomes the assistant response.
        const wideTable =
            "| Column A | Column B | Column C | Column D | Column E |\n" +
            "|----------|----------|----------|----------|----------|\n" +
            "| Value 1  | Value 2  | Value 3  | Value 4  | Value 5  |\n" +
            "| Value 6  | Value 7  | Value 8  | Value 9  | Value 10 |";

        await chatPage.sendMessage(wideTable);
        await chatPage.waitForIdle();

        await chatPage.assertLastResponseFitsInBubble();
    });

    test("Each assistant message keeps the model that generated it", async ({
        page,
    }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectModel("gpt-4o");

        await chatPage.sendMessage("first message");
        await chatPage.assertLastResponse("first message");
        await chatPage.waitForIdle();

        await chatPage.selectModel("gpt-4o-mini");

        await chatPage.sendMessage("second message");
        await chatPage.assertLastResponse("second message");
        await chatPage.waitForIdle();

        await chatPage.assertAssistantMessageModelName(0, "gpt-4o");
        await chatPage.assertAssistantMessageModelName(1, "gpt-4o-mini");
    });
});
