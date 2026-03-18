import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Plugin } from "vite";

/**
 * Vite plugin that adds /api/chat and /api/models endpoints during development.
 * Proxies requests to an OpenAI-compatible backend (e.g. llmock).
 */
export function apiChatPlugin(): Plugin {
    return {
        name: "api-chat",
        configureServer(server) {
            // Proxy /api/models — avoids CORS when fetching model lists from providers
            server.middlewares.use("/api/models", async (req, res) => {
                if (req.method !== "POST") {
                    res.statusCode = 405;
                    res.end("Method Not Allowed");
                    return;
                }
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                    chunks.push(chunk as Buffer);
                }
                const { baseURL, apiKey } = JSON.parse(
                    Buffer.concat(chunks).toString(),
                ) as { baseURL: string; apiKey: string };
                try {
                    const upstream = await fetch(`${baseURL}/models`, {
                        headers: { Authorization: `Bearer ${apiKey}` },
                    });
                    res.statusCode = upstream.status;
                    res.setHeader("Content-Type", "application/json");
                    res.end(await upstream.text());
                } catch {
                    res.statusCode = 502;
                    res.end(JSON.stringify({ error: "Provider unreachable" }));
                }
            });

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
                const { messages, modelId, baseURL, apiKey } = body as {
                    messages: UIMessage[];
                    modelId?: string;
                    baseURL?: string;
                    apiKey?: string;
                };

                const provider = createOpenAI({
                    baseURL: baseURL ?? "http://localhost:3001",
                    apiKey: apiKey ?? "your-secret-api-key",
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
