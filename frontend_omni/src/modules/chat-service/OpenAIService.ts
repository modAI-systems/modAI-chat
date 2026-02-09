import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import type { ChatService, Message, MessagePart } from "./index";
import { MessagePartType } from "./index";

/**
 * Abstract OpenAI Chat Service that provides common streaming functionality.
 * Subclasses must implement createOpenAI to provide the appropriate OpenAI client
 * configuration for their specific use case (backend-proxied or direct API access).
 */
export abstract class OpenAIChatService implements ChatService {
    /**
     * Creates an OpenAI client configured for the specific provider.
     * @param modelId The full model ID in format "{provider_type}/{provider_name}/{model_id}"
     * @returns OpenAI client instance or null if provider configuration is not available
     */
    protected abstract createOpenAI(modelId: string): OpenAI | null;

    /**
     * Returns the model ID to use when calling the OpenAI API.
     * Override this in subclasses to transform the model ID if needed.
     * @param modelId The full model ID in format "{provider_type}/{provider_name}/{model_id}"
     * @returns The model ID to send to the API
     */
    protected getApiModelId(modelId: string): string {
        return modelId;
    }

    async *sendMessage(
        modelId: string,
        message: string,
        previousMessages: Message[],
    ): AsyncIterable<MessagePart> {
        if (!message.trim()) return;

        // Parse modelId: format is "{provider_type}/{provider_name}/{model_id}"
        const parts = modelId.split("/");
        if (parts.length < 3) {
            throw new Error(`Invalid model ID format: ${modelId}`);
        }

        const openai = this.createOpenAI(modelId);
        if (!openai) {
            throw new Error(
                `Could not create OpenAI client for model: ${modelId}`,
            );
        }

        const apiModelId = this.getApiModelId(modelId);
        yield* this.streamResponse(
            openai,
            apiModelId,
            message,
            previousMessages,
        );
    }

    private async *streamResponse(
        openai: OpenAI,
        modelId: string,
        message: string,
        previousMessages: Message[],
    ): AsyncIterable<MessagePart> {
        try {
            const inputItems = previousMessages.map((msg) => ({
                type: "message",
                role: msg.role,
                content: [{ type: "input_text", text: msg.content }],
            }));

            inputItems.push({
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: message.trim() }],
            });

            const stream = await openai.responses.create({
                model: modelId,
                input: inputItems as ResponseInput,
                stream: true,
            });

            for await (const event of stream) {
                if (
                    event.type === "response.output_text.delta" &&
                    event.delta
                ) {
                    yield {
                        type: MessagePartType.TEXT,
                        text: event.delta,
                    };
                }
            }
        } catch (error) {
            console.error("OpenAI API error:", error);
            throw error;
        }
    }
}

/**
 * OpenAI Chat Service for use with a backend.
 * Routes requests through the backend /api/v1 endpoint which handles
 * provider routing and authentication.
 */
export class WithBackendOpenAIChatService extends OpenAIChatService {
    protected createOpenAI(_modelId: string): OpenAI {
        return new OpenAI({
            apiKey: "not-needed-backend-handles-auth",
            baseURL: `/api/v1`,
            dangerouslyAllowBrowser: true,
        });
    }
}

/**
 * OpenAI Chat Service for browser-only mode (no backend).
 * Fetches provider configuration from localStorage and makes direct
 * API calls to the configured provider endpoint.
 */
export class NoBackendOpenAIChatService extends OpenAIChatService {
    private static readonly LOCAL_STORAGE_KEY = "llm_providers";

    protected createOpenAI(modelId: string): OpenAI | null {
        // Parse modelId: format is "{provider_type}/{provider_name}/{model_id}"
        const parts = modelId.split("/");
        if (parts.length < 3) {
            return null;
        }

        const providerName = parts[1];
        const provider = this.getProviderByName(providerName);

        if (!provider) {
            console.error(`Provider not found: ${providerName}`);
            return null;
        }

        return new OpenAI({
            apiKey: provider.api_key,
            baseURL: provider.base_url,
            dangerouslyAllowBrowser: true,
        });
    }

    /**
     * Returns only the actual model ID (without provider prefix) for direct API calls.
     * Format: "{provider_type}/{provider_name}/{model_id}" -> "{model_id}"
     */
    protected getApiModelId(modelId: string): string {
        const parts = modelId.split("/");
        return parts.length >= 3 ? parts.slice(2).join("/") : modelId;
    }

    private getProviderByName(
        providerName: string,
    ): { base_url: string; api_key: string } | null {
        try {
            const stored = localStorage.getItem(
                NoBackendOpenAIChatService.LOCAL_STORAGE_KEY,
            );
            if (!stored) {
                return null;
            }

            const providers = JSON.parse(stored);
            const provider = providers.find(
                (p: { name: string }) => p.name === providerName,
            );

            return provider || null;
        } catch (error) {
            console.error("Failed to load provider from localStorage:", error);
            return null;
        }
    }
}
