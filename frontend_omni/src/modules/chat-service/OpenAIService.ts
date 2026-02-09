import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import type { ChatService, Message, MessagePart } from "./index";
import { MessagePartType } from "./index";

/**
 * OpenAI Chat Service that calls the backend /api/v1/responses endpoint.
 * The backend handles provider routing based on the model ID.
 */
export class OpenAIChatService implements ChatService {
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

        // Backend expects full model ID for routing: "{provider_type}/{provider_name}/{model_id}"
        // The backend router uses the first part (provider_type) to route to the appropriate LLM module
        const openai = new OpenAI({
            apiKey: "not-needed-backend-handles-auth",
            baseURL: `${window.location.origin}/api/v1`,
            dangerouslyAllowBrowser: true,
        });

        yield* this.streamResponse(openai, modelId, message, previousMessages);
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
