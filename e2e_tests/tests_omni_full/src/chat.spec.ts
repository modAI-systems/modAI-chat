import { test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import {
    ChatPage,
    LLMProvidersPage,
    NanoIdpLoginPage,
    ToolsManagementPage,
} from "./pages";

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
        await page
            .getByText("How can I help you today?")
            .waitFor({ state: "visible", timeout: 20000 });
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

    test("should call dice-roller tool and return result", async ({ page }) => {
        // Enable the dice-roller tool via the Tools management page
        const toolsPage = new ToolsManagementPage(page);
        await toolsPage.navigateTo();
        await toolsPage.enableTool("roll_dice");

        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();
        await chatPage.selectFirstModel();

        // llmock trigger: "call tool '<name>' with '<json>'" causes it to return
        // a tool_call response. The backend Strands agent then calls the
        // dice-roller microservice (port 8001) and sends the result back.
        // LLMock responds with "last tool call result is <json>" after the agent
        // sends the tool result back.
        await chatPage.sendMessage(
            "call tool 'roll_dice' with '{\"count\": 1, \"sides\": 6}'",
        );
        await chatPage.assertLastResponse("last tool call result is", 20000);
    });
});
