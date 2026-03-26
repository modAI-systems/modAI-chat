# Conversation Service

Manages conversation state and orchestrates message sending through the chat service. No UI components available in this module group.

## Intended Usage

Other modules retrieve the active conversation service via `getConversationService()` and create conversations to manage chat state.

```svelte
<script lang="ts">
  import { getConversationService } from "@/modules/conversation-service/index.svelte.ts";

  const conversationService = getConversationService();
  const conversation = conversationService.createConversation();

  // conversation.messages — reactive message list
  // conversation.status — "ready" | "submitted" | "streaming"
  await conversation.send("Hello!", selectedModel, selectedTools);
</script>
```

Modules that consume this service must declare a `module:conversation-service` dependency in `modules*.json` so they only activate when a conversation service is present.

## API

### `conversationService.createConversation()`

Returns a `Conversation` instance with:

- `messages: UIMessage[]` (readonly) — the reactive message history
- `status: ChatStatus` (readonly) — `"ready"`, `"submitted"`, or `"streaming"`
- `send(text, model, tools?)` — appends user + assistant messages, streams the response via `chat-service`, and updates messages reactively

## Intended Integration

The service is registered and discovered automatically by the module system. The default implementation (`openai.svelte.ts`) uses OpenAI-compatible message roles (`user`/`assistant`). To swap it, register a different implementation in `modules*.json`:

```json
{
  "id": "conversation-service",
  "type": "ConversationService",
  "path": "@/modules/conversation-service/openai",
  "dependencies": ["module:chat-service"]
}
```
