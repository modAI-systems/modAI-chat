# Chat Service

Provides AI chat streaming functionality, abstracting the OpenAI-compatible API provider.
No UI components available in this module group.

## Intended Usage

Other modules retrieve the active chat service via `getChatService()` and call `streamChat` to stream assistant responses.

```svelte
<script lang="ts">
  import { getChatService } from "@/modules/chat-service/index.svelte.js";
  import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
  import type { UIMessage } from "ai";

  const chatService = getChatService();  // called at component init

  async function sendMessage(model: ProviderModel, messages: UIMessage[]) {
    for await (const textPart of chatService.streamChat(model, messages)) {
      // handle each streamed text chunk
    }
  }
</script>
```

Modules that consume this service must declare a `module:chat-service` dependency in `modules*.json` so they only activate when a chat service is present.

## API

### `chatService.streamChat(model, messages)`

- `model: ProviderModel` — the provider and model to use (from `llm-provider-service`)
- `messages: UIMessage[]` — the conversation history to send
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
