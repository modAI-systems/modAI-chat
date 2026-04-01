import { test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
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

        // Ensure chat tab is active
        await chatPage.navigateTo();

        // Select first available model
        await chatPage.selectFirstModel();

        // Send message
        await chatPage.sendMessage("Hi");

        // Wait for and assert response content is visible
        await chatPage.assertMessageVisible("Hi");
    });
});
