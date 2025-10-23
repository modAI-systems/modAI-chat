import { expect, test } from "@playwright/test";
import { createMockOpenAIHelper } from "./mock-openai-helper";

test.describe("Mock OpenAI Server Tests", () => {
    test("should mock chat completion response", async ({ request }) => {
        const mockHelper = createMockOpenAIHelper(request);

        // Set up mock response
        await mockHelper.setSimpleCompletionResponse("Hello from mock server!");

        // Test the mock endpoint directly
        const response = await request.post(
            "http://localhost:3001/chat/completions",
            {
                data: {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Hello" }],
                },
            },
        );

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.choices[0].message.content).toBe("Hello from mock server!");
    });

    test("should mock models response", async ({ request }) => {
        const mockHelper = createMockOpenAIHelper(request);

        // Set up custom models
        await mockHelper.setModels([
            {
                id: "custom-model-1",
                object: "model",
                created: 1234567890,
                owned_by: "test",
            },
        ]);

        // Test the models endpoint
        const response = await request.get("http://localhost:3001/models");
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data).toHaveLength(1);
        expect(data.data[0].id).toBe("custom-model-1");
    });

    test("should mock streaming response", async ({ request }) => {
        const mockHelper = createMockOpenAIHelper(request);

        // Set up streaming response
        await mockHelper.setSimpleStreamingResponse(
            "This is a streaming response",
        );

        // Test streaming endpoint
        const response = await request.post(
            "http://localhost:3001/chat/completions",
            {
                data: {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Hello" }],
                    stream: true,
                },
            },
        );

        expect(response.ok()).toBeTruthy();
        const text = await response.text();
        // Check that the streaming response contains the expected content pieces
        expect(text).toContain('"content":"This "');
        expect(text).toContain('"content":"is "');
        expect(text).toContain('"content":"a "');
        expect(text).toContain('"content":"streaming "');
        expect(text).toContain('"content":"response"');
        expect(text).toContain('"finish_reason":"stop"');
        expect(text).toContain("data: [DONE]");
    });

    test("should reset mock server", async ({ request }) => {
        const mockHelper = createMockOpenAIHelper(request);

        // First set custom response
        const setResult = await mockHelper.setSimpleCompletionResponse(
            "Custom response for reset test",
        );
        expect(setResult.success).toBe(true);

        // Verify it's set
        let response = await request.post(
            "http://localhost:3001/chat/completions",
            {
                data: {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Hello" }],
                },
            },
        );
        let data = await response.json();
        expect(data.choices[0].message.content).toBe(
            "Custom response for reset test",
        );

        // Reset
        const resetResult = await mockHelper.reset();
        expect(resetResult.success).toBe(true);

        // Verify it's back to default
        response = await request.post(
            "http://localhost:3001/chat/completions",
            {
                data: {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Hello" }],
                },
            },
        );
        data = await response.json();
        expect(data.choices[0].message.content).toBe(
            "This is a mock response from the test server.",
        );
    });
});
