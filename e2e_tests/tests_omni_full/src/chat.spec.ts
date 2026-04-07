import { expect, test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";
const LLMOCK_URL = "http://localhost:3001";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        // Reset backend state before each test
        await page.request.post(`${BACKEND_URL}/api/reset/full`);
        // Reset llmock history before each test
        await page.request.delete(`${LLMOCK_URL}/history`);

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
        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();
        await chatPage.selectFirstModel();
        await chatPage.enableTool("Roll Dice");

        // llmock trigger: "call tool '<name>' with '<json>'" causes it to return
        // a tool_call response. The backend Strands agent then calls the
        // dice-roller microservice (port 8001) and sends the result back.
        // LLMock responds with "last tool call result is <json>" after the agent
        // sends the tool result back.
        await chatPage.sendMessage(
            "call tool 'roll_dice' with '{\"count\": 1, \"sides\": 6}'",
        );
        await chatPage.assertLastResponse("last tool call result is", 20000);

        // Verify the full tool definition was sent to the LLM.
        const historyResponse = await page.request.get(`${LLMOCK_URL}/history`);
        const history = await historyResponse.json();
        const toolCallRequest = history.requests.find(
            (r: { path: string; body: { tools?: unknown[] } }) =>
                r.path === "/chat/completions" &&
                Array.isArray(r.body?.tools) &&
                r.body.tools.length > 0,
        );
        expect(toolCallRequest).toBeDefined();
        expect(toolCallRequest.body.tools).toEqual([
            {
                type: "function",
                function: {
                    name: "roll_dice",
                    description: "Roll dice and return the results",
                    parameters: {
                        type: "object",
                        title: "DiceRequest",
                        properties: {
                            count: {
                                type: "integer",
                                title: "Count",
                                description: "Number of dice to roll",
                                default: 1,
                                minimum: 1.0,
                                maximum: 100.0,
                            },
                            sides: {
                                type: "integer",
                                title: "Sides",
                                description: "Number of sides per die",
                                default: 6,
                                minimum: 2.0,
                                maximum: 100.0,
                            },
                        },
                        // Strands adds "required": [] when the field is absent in the schema.
                        required: [],
                    },
                },
            },
        ]);
    });
});
