import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Plugin } from "vite";

/**
 * Vite plugin that adds an /api/chat endpoint during development.
 * Proxies requests to an OpenAI-compatible backend (e.g. llmock).
 */
export function apiChatPlugin(): Plugin {
    return {
        name: "api-chat",
        configureServer(server) {
            server.middlewares.use("/api/chat", async (req, res) => {
                if (req.method !== "POST") {
                    res.statusCode = 405;
                    res.end("Method Not Allowed");
                    return;
                }

                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                    chunks.push(chunk as Buffer);
                }
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { messages, model: modelId } = body as {
                    messages: UIMessage[];
                    model?: string;
                };

                const provider = createOpenAI({
                    baseURL: "http://localhost:3002",
                    apiKey: "your-secret-api-key",
                });

                const result = streamText({
                    model: provider(modelId ?? "gpt-4o"),
                    messages: await convertToModelMessages(messages),
                });

                const response = (await result).toUIMessageStreamResponse();

                res.statusCode = response.status ?? 200;
                response.headers.forEach((value, key) => {
                    res.setHeader(key, value);
                });

                if (response.body) {
                    const reader = response.body.getReader();
                    const pump = async () => {
                        const { done, value } = await reader.read();
                        if (done) {
                            res.end();
                            return;
                        }
                        res.write(value);
                        await pump();
                    };
                    await pump();
                } else {
                    res.end();
                }
            });
        },
    };
}
