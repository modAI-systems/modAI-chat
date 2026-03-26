# Chat Service

Provides low-level AI chat streaming functionality, abstracting the provider-specific API.
No UI components available in this module group.

## Intended Usage

Typically consumed by the `conversation-service` rather than directly by UI modules. The conversation service handles message state; this service only streams text.

```svelte
<script lang="ts">
  import { getChatService } from "@/modules/chat-service/index.svelte.ts";
  import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.ts";
  import type { UIMessage } from "ai";

  const chatService = getChatService();  // called at component init

  async function sendMessage(model: ProviderModel, messages: UIMessage[]) {
    for await (const textPart of chatService.streamChat(model, messages)) {
      // handle each streamed text chunk
    }
  }
</script>
```

## API

### `chatService.streamChat(model, messages, tools?)`

- `model: ProviderModel` — the provider and model to use (from `llm-provider-service`)
- `messages: UIMessage[]` — the conversation history to send
- `tools?: Tool[]` — optional tools to make available to the model
- Returns: `AsyncGenerator<string>` — yields text chunks as they stream in
- Throws when the provider is unreachable or returns an error

## Intended Integration

The service is registered and discovered automatically by the module system. The default implementation (`openai.svelte.ts`) uses the OpenAI-compatible API via the AI SDK. To swap it, register a different implementation in `modules*.json`:

```json
{
  "id": "chat-service",
  "type": "ChatService",
  "path": "@/modules/chat-service/openai",
  "dependencies": []
}
```
