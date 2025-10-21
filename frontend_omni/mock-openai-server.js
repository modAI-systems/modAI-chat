import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.MOCK_OPENAI_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data storage
let mockModels = [
    {
        id: 'gpt-3.5-turbo',
        object: 'model',
        created: 1677610602,
        owned_by: 'openai'
    },
    {
        id: 'gpt-4',
        object: 'model',
        created: 1687882411,
        owned_by: 'openai'
    }
];

let mockCompletionResponse = {
    id: 'chatcmpl-mock',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [{
        index: 0,
        message: {
            role: 'assistant',
            content: 'This is a mock response from the test server.'
        },
        finish_reason: 'stop'
    }],
    usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
    }
};

let mockStreamingResponse = [
    {
        id: 'chatcmpl-mock-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
            index: 0,
            delta: { content: 'This ' },
            finish_reason: null
        }]
    },
    {
        id: 'chatcmpl-mock-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
            index: 0,
            delta: { content: 'is ' },
            finish_reason: null
        }]
    },
    {
        id: 'chatcmpl-mock-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
            index: 0,
            delta: { content: 'a mock streaming response.' },
            finish_reason: 'stop'
        }]
    }
];

// Routes
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Mock OpenAI server is running' });
});

app.get('/models', (req, res) => {
    res.json({
        object: 'list',
        data: mockModels
    });
});

app.post('/chat/completions', async (req, res) => {
    const { stream = false } = req.body;

    if (stream) {
        // Handle streaming response
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for (const chunk of mockStreamingResponse) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } else {
        // Handle regular response
        res.json(mockCompletionResponse);
    }
});

// Admin endpoints for controlling mock responses
app.post('/admin/set-models', (req, res) => {
    mockModels = req.body.models || [];
    res.json({ success: true, models: mockModels });
});

app.post('/admin/set-completion-response', (req, res) => {
    mockCompletionResponse = req.body.response || mockCompletionResponse;
    res.json({ success: true, response: mockCompletionResponse });
});

app.post('/admin/set-streaming-response', (req, res) => {
    mockStreamingResponse = req.body.chunks || [];
    res.json({ success: true, chunks: mockStreamingResponse });
});

app.post('/admin/reset', (req, res) => {
    // Reset to defaults
    mockModels = [
        {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai'
        },
        {
            id: 'gpt-4',
            object: 'model',
            created: 1687882411,
            owned_by: 'openai'
        }
    ];

    mockCompletionResponse = {
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
            index: 0,
            message: {
                role: 'assistant',
                content: 'This is a mock response from the test server.'
            },
            finish_reason: 'stop'
        }],
        usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
        }
    };

    mockStreamingResponse = [
        {
            id: 'chatcmpl-mock-stream',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'gpt-3.5-turbo',
            choices: [{
                index: 0,
                delta: { content: 'This ' },
                finish_reason: null
            }]
        },
        {
            id: 'chatcmpl-mock-stream',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'gpt-3.5-turbo',
            choices: [{
                index: 0,
                delta: { content: 'is ' },
                finish_reason: null
            }]
        },
        {
            id: 'chatcmpl-mock-stream',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'gpt-3.5-turbo',
            choices: [{
                index: 0,
                delta: { content: 'a mock streaming response.' },
                finish_reason: 'stop'
            }]
        }
    ];

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Mock OpenAI server running on port ${PORT}`);
});
