# LLM Picker

Provides a dropdown component for selecting Large Language Models (LLMs) and manages the selected model state through a React context.

## Intended Usage

Other modules can use the `LLMPicker` component to allow users to select an LLM model, and access the selected model through the `useLLMContext` hook.

```tsx
import { LLMPicker, useLLMContext } from "@/modules/llm-picker";

function MyComponent() {
  const { selectedModel } = useLLMContext();

  return (
    <div>
      <LLMPicker />
      <p>Selected model: {selectedModel}</p>
    </div>
  );
}
```

## Intended Integration

The context provider is registered as a global context provider, making the LLM selection state available throughout the application.

```tsx
<ModuleContextProvider name="GlobalContextProvider">
  // The LLM context is now available globally
</ModuleContextProvider>
```

## Sub-Module Integration

No sub-module integration is currently supported.</content>
<parameter name="filePath">/home/guenther/dev/modAI-chat/frontend_omni/src/modules/llm-picker/README.md
