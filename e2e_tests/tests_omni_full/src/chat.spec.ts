import { test } from "@playwright/test";
import { ChatPage, LLMProvidersPage, LoginPage, SignupPage } from "./pages";

test.describe("Chat", () => {
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        const signupPage = new SignupPage(page);

        try {
            await signupPage.goto();
            await signupPage.signupUser(
                "admin@example.com",
                "admin",
                "Administrator",
            );
            console.log("Test user signup initiated");
        } catch (error) {
            console.warn("Could not signup test user:", error);
        } finally {
            await page.close();
        }
    });

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login("admin@example.com", "admin");
    });

    test("should send a message and receive a response", async ({ page }) => {
        const llmProviderPage = new LLMProvidersPage(page);
        const chatPage = new ChatPage(page);

        // Configure mock provider
        await llmProviderPage.navigateTo();
        await llmProviderPage.addProvider(
            "Mock Provider",
            "http://localhost:3001/v1",
            "your-secret-api-key",
        );

        // Navigate to chat and select first model
        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        // Send message
        await chatPage.sendMessage("Hi");

        // Wait for and assert response
        await chatPage.waitForResponse();
        await chatPage.assertResponseExists();
    });
});
