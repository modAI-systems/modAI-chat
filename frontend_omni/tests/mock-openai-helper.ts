import type { APIRequestContext } from "@playwright/test";

const MOCK_SERVER_URL = "http://localhost:3001";

// Types for OpenAI API responses
type OpenAICompletionResponse =
    | {
          id: string;
          object: string;
          created: number;
          model: string;
          choices: Array<{
              index: number;
              message: {
                  role: string;
                  content: string;
              };
              finish_reason: string;
          }>;
          usage: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
          };
      }
    | {
          error: {
              message: string;
              type: string;
              code: number;
          };
      };

interface OpenAIStreamingChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            content: string;
        };
        finish_reason: string | null;
    }>;
}

/**
 * Test helper for controlling the mock OpenAI server responses
 */
export class MockOpenAIHelper {
    private request: APIRequestContext;

    constructor(request: APIRequestContext) {
        this.request = request;
    }

    /**
     * Set the mock models response
     */
    async setModels(
        models: Array<{
            id: string;
            object: string;
            created: number;
            owned_by: string;
        }>,
    ) {
        const response = await this.request.post(
            `${MOCK_SERVER_URL}/admin/set-models`,
            {
                data: { models },
            },
        );
        return response.json();
    }

    /**
     * Set the mock chat completion response
     */
    async setCompletionResponse(response: OpenAICompletionResponse) {
        const apiResponse = await this.request.post(
            `${MOCK_SERVER_URL}/admin/set-completion-response`,
            {
                data: { response },
            },
        );
        return apiResponse.json();
    }

    /**
     * Set the mock streaming response chunks
     */
    async setStreamingResponse(chunks: OpenAIStreamingChunk[]) {
        const response = await this.request.post(
            `${MOCK_SERVER_URL}/admin/set-streaming-response`,
            {
                data: { chunks },
            },
        );
        return response.json();
    }

    /**
     * Reset all mock responses to defaults
     */
    async reset() {
        const response = await this.request.post(
            `${MOCK_SERVER_URL}/admin/reset`,
        );
        return response.json();
    }

    /**
     * Set a simple text response for chat completion
     */
    async setSimpleCompletionResponse(text: string, model = "gpt-3.5-turbo") {
        const response = {
            id: "chatcmpl-mock",
            object: "chat.completion",
            created: Date.now(),
            model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: "assistant",
                        content: text,
                    },
                    finish_reason: "stop",
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: text.split(" ").length,
                total_tokens: 10 + text.split(" ").length,
            },
        };
        return this.setCompletionResponse(response);
    }

    /**
     * Set a simple streaming response
     */
    async setSimpleStreamingResponse(text: string, model = "gpt-3.5-turbo") {
        const words = text.split(" ");
        const chunks = words.map((word, index) => ({
            id: "chatcmpl-mock-stream",
            object: "chat.completion.chunk",
            created: Date.now(),
            model,
            choices: [
                {
                    index: 0,
                    delta: {
                        content: word + (index < words.length - 1 ? " " : ""),
                    },
                    finish_reason: index === words.length - 1 ? "stop" : null,
                },
            ],
        }));
        return this.setStreamingResponse(chunks);
    }

    /**
     * Set an error response
     */
    async setErrorResponse(statusCode: number, message: string) {
        // For errors, we need to modify the server behavior
        // This is a simplified approach - in a real implementation you might want to
        // add more admin endpoints for error simulation
        const errorResponse = {
            error: {
                message,
                type: "invalid_request_error",
                code: statusCode,
            },
        };
        return this.setCompletionResponse(errorResponse);
    }
}

/**
 * Factory function to create a MockOpenAIHelper instance
 */
export function createMockOpenAIHelper(
    request: APIRequestContext,
): MockOpenAIHelper {
    return new MockOpenAIHelper(request);
}
