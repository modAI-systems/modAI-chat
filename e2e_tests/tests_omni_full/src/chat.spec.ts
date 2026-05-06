import { test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";
const AIMOCK_URL = "http://localhost:4010/v1";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        // Reset backend state before each test
        await page.request.post(`${BACKEND_URL}/api/reset/full`);

        // Login via NanoIDP (navigates to / which triggers backend OIDC flow)
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Set up mock LLM provider via backend API
        const providerPage = new LLMProvidersPage(page);
        await providerPage.addProvider("Mock Provider", AIMOCK_URL, "");
        await page
            .getByText("How can I help you today?")
            .waitFor({ state: "visible", timeout: 20000 });
    });

    test("should send a message and receive a response", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectModel("gpt-4o");

        await chatPage.sendMessage("Hi");
        await chatPage.assertLastResponse("Hi");
    });

    test("should handle multiple messages", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectModel("gpt-4o");

        await chatPage.sendMessage("Hi");
        await chatPage.assertLastResponse("Hi");

        await chatPage.sendMessage("Hello again");
        await chatPage.assertLastResponse("Hello again");
    });

    test("should call dice-roller tool and return result", async ({ page }) => {
        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();
        await chatPage.selectModel("gpt-4o");
        await chatPage.enableTool("Roll Dice");

        // AIMock: when tools are present and no prior tool result it returns
        // a function_call for the first tool. The backend Strands agent executes
        // roll_dice and sends the result back. AIMock then responds with
        // "last tool call result is {json}" which is what we assert.
        await chatPage.sendMessage("roll the dice");
        await chatPage.assertLastResponse("last tool call result is", 20000);
    });
});
