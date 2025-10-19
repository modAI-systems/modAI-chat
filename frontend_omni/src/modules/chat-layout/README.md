# UI Panel Provider

Provides global context for controlling the visibility and content of left and right panels in the chat layout.

## Intended Usage

Other modules can use the `useChatSidePanels` hook to control the panel content.

```tsx
import { useChatSidePanels } from "@/modules/chat-layout/hooks";

function SomeComponent() {
  const { leftPanel, setLeftPanel, rightPanel, setRightPanel } =
    useChatSidePanels();

  const showLeftDetails = () => {
    setLeftPanel(<div>Some details here</div>);
  };

  const hideLeftDetails = () => {
    setLeftPanel(null);
  };

  const showRightDetails = () => {
    setRightPanel(<div>Some other details here</div>);
  };

  const hideRightDetails = () => {
    setRightPanel(null);
  };

  return (
    <div>
      <button onClick={showLeftDetails}>Show Left Details</button>
      <button onClick={hideLeftDetails}>Hide Left Details</button>
      <button onClick={showRightDetails}>Show Right Details</button>
      <button onClick={hideRightDetails}>Hide Right Details</button>
    </div>
  );
}
```

## Intended Integration

This module is registered as a `GlobalContextProvider` in the manifest.json, so it is automatically loaded at app startup.

## Sub-Module Integration

No sub-module integration required. This is a context provider for other modules to use.
