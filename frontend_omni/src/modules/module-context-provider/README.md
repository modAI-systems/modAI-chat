# Module System

Allows other modules to get their contexts loaded at a defined level in the app.

Example: Modules with a type `GlobalContextProvider` will get their provider loaded at a very early stage in the app. Their provider state is basically available throuout the entire application.

Well known module types

- `GlobalContextProvider`: exported providers with of this module type will be loaded very early.

## Intended Integration

```tsx
<ModuleContextProvider name="GlobalContextProvider">
  // All context providers with type "GlobalContextProvider" are now accessible
</ModuleContextProvider>
```

## Sub-Module Integration

Modules who want to integrate themself into this context provider must export a valid React component with a structure like this:

```ts
export const AwesomeContext = createContext(...);

export function AwesomeContextProvider({ children }: { children: React.ReactNode }) {
    ...
    return (
        <AwesomeContext value={someValue}>
            {children}
        </AwesomeContext>
    );
}
```

The provider must be defined in the `modules.json` with the correct type like `GlobalContextProvider`:

```json
{
  "id": "awesomeContextProvider",
  "type": "GlobalContextProvider",
  "path": "@/modules/awesome-service/AwesomeContextProvider.tsx",
  "dependencies": ["module:session"]
}
```

The new `AwesomeContextProvider` will be loaded whenever the `<ModuleContextProvider name={SOME_CONTEXT_PROVIDER_TYPE}>` is loaded and from that point on, the context is available to all its children.
