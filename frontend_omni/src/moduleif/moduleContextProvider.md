# Module System

Module Type: Hook

## Description

This is a context provider hook module allowing other modules to define their contexts to get them loaded at a defined level in the app.

Example: Modules exporting a context provider with name `GlobalModuleContextProvider` will get their provider loaded at a very early stage in the app. Their provider state is basically available throuout the entire application.

Well known module classes

- `GlobalModuleContextProvider`: exported providers with of this module class will be loaded very early

## Intended Usage

This module is not exposing anything to be used directly

## Intended Integration

This is how the current module implementation `ModuleContextProvider` should be integrated:

```jsx
// This constant is usually in the `moduleif/` interface to make it also available to other dependent modules
export const SOME_CONTEXT_PROVIDER_CLASS_NAME = "SomeModuleContextProvider"


// The usage of the provider is then in the actual implementation of the class
<ModuleContextProvider name={SOME_CONTEXT_PROVIDER_CLASS_NAME}>
  ...
</ModuleContextProvider>
```

This module provider will now look for other module classes with the name `SomeModuleContextProvider` and load their contexts.

## Sub Module Implementation Detail

Modules who want to integrate themself into this context provider must export a valid React component with a structure like this:

```ts
// Creating the context is usually done in the `moduleif/` interface class
export const AwesomeContext = createContext(...);

// The actual provider is then usually created in the `module/awesome-provider/` implementation
export function AwesomeContextProvider({ children }: { children: React.ReactNode }) {
    ...
    return (
        <AwesomeContext value={someValue}>
            {children}
        </AwesomeContext>
    );
}
```

Then the new provider is exported in the module `Metadata.ts`

```ts
// Now use the existing constant to register the new provider
export const Metadata: ModuleMetadata = {
    ...
    exports: {
        [SOME_CONTEXT_PROVIDER_CLASS_NAME]: AwesomeContextProvider,
    },
};
```

The new `AwesomeContextProvider` will be loaded whenever the `<ModuleContextProvider name={SOME_CONTEXT_PROVIDER_CLASS_NAME}>` is loaded and from that point on, the context is available to all its children.
