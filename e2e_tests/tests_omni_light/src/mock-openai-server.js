import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.MOCK_OPENAI_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data storage
const mockModels = [
    {
        id: "gpt-3.5-turbo",
        object: "model",
        created: 1677610602,
        owned_by: "openai",
    },
    {
        id: "gpt-4",
        object: "model",
        created: 1687882411,
        owned_by: "openai",
    },
];

const MOCK_RESPONSE_TEXT = "This is a mock response from the test server.";

// Routes
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Mock OpenAI server is running" });
});

app.get("/models", (_req, res) => {
    res.json({
        object: "list",
        data: mockModels,
    });
});

app.post("/chat/completions", async (req, res) => {
    const { stream = false } = req.body;

    if (stream) {
        // Handle streaming response
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const words = MOCK_RESPONSE_TEXT.split(" ");
        for (let i = 0; i < words.length; i++) {
            const chunk = {
                id: "chatcmpl-mock-stream",
                object: "chat.completion.chunk",
                created: Date.now(),
                model: "gpt-3.5-turbo",
                choices: [
                    {
                        index: 0,
                        delta: {
                            content:
                                words[i] + (i < words.length - 1 ? " " : ""),
                        },
                        finish_reason: i === words.length - 1 ? "stop" : null,
                    },
                ],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        res.write("data: [DONE]\n\n");
        res.end();
    } else {
        // Handle regular response
        res.json({
            id: "chatcmpl-mock",
            object: "chat.completion",
            created: Date.now(),
            model: "gpt-3.5-turbo",
            choices: [
                {
                    index: 0,
                    message: {
                        role: "assistant",
                        content: MOCK_RESPONSE_TEXT,
                    },
                    finish_reason: "stop",
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            },
        });
    }
});

app.listen(PORT, () => {
    console.log(`Mock OpenAI server running on port ${PORT}`);
});
