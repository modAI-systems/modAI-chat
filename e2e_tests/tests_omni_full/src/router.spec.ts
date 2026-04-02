import { test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";

test.describe("Router", () => {
    test.beforeEach(async ({ page }) => {
        // Reset backend state before each test
        await page.request.post(`${BACKEND_URL}/api/reset/full`);

        // Login via NanoIDP (navigates to / which triggers backend OIDC flow)
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Set up mock LLM provider via backend API
        const providerPage = new LLMProvidersPage(page);
        await providerPage.addProvider(
            "Mock Provider",
            "http://localhost:3001",
            "",
        );
    });

    test("should render chat for unknown routes via fallback", async ({
        page,
    }) => {
        const chatPage = new ChatPage(page);

        await chatPage.goto("/missing-route");
        await chatPage.selectFirstModel();

        await chatPage.sendMessage("Fallback route works");
        await chatPage.assertLastResponse("Fallback route works");
    });
});
