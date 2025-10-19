# Welcome Message

Provides welcome components that are displayed in the chat area when there are no messages.

## Intended Usage

This module group contains components that serve as welcome messages for different scenarios in the chat interface. These components are automatically displayed when the chat area is empty.

## Intended Integration

The welcome message components are loaded via the module system and displayed in the MessageList component when there are no messages. Components in this module should be registered with the type "ChatWelcomeMessagePane".

## Sub-Module Integration

### Welcome Message Components

Components in this module group should export a default React component that renders a welcome message. The component will be displayed in the chat conversation area when there are no messages.

Example component structure:

```tsx
import { ConversationEmptyState } from "@/modules/chat-layout/shadcn/components/ai-elements/conversation";

export default function MyWelcomeMessage() {
  return (
    <ConversationEmptyState
      title="Welcome!"
      description="Start chatting to see messages here"
      icon={<SomeIcon />}
    />
  );
}
```
