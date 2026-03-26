# Chat

Core chat UI providing the conversation area, message input with model selection, and the chat route.

## Intended Usage

Other modules typically don't consume chat components directly. The chat module is composed by the module system and rendered via `ChatRoute`.

## Sub-Module Integration

The chat module loads its sub-components via the module system:

- `ChatConversationArea` (type `"ChatConversationArea"`) — renders the message history
- `ChatInputPanel` (type `"ChatInputPanel"`) — provides the message input and model selector

To replace either, register an alternative component with the same type in `modules*.json`.
