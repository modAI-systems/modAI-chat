import { test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        // Reset backend state before each test
        await page.request.post(`${BACKEND_URL}/api/reset/full`);

        // Login via NanoIDP (navigates to / which triggers backend OIDC flow)
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Set up mock LLM provider via localStorage
        const providerPage = new LLMProvidersPage(page);
        await providerPage.addProvider(
            "Mock Provider",
            "http://localhost:3001",
            "",
        );
    });

    test("should send a message and receive a response", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        await chatPage.sendMessage("Hi");
        await chatPage.assertLastResponse("Hi");
    });

    test("should handle multiple messages", async ({ page }) => {
        const chatPage = new ChatPage(page);

        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        await chatPage.sendMessage("Hi");
        await chatPage.assertLastResponse("Hi");

        await chatPage.sendMessage("Hello again");
        await chatPage.assertLastResponse("Hello again");
    });
});
