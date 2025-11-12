# Module System

The core module management functionality, including module loading, component discovery, and dynamic module composition.

## Intended Usage

```jsx
const modules = useModules();

// Multiple items can be loaded
const awesomeComponents = modules.getAll(
  AWESOME_COMPONENT_MODULE_CLASS_NAME
);

// Or just one single item which returns null if not exaclty 1 is registered
const MainContainer = module.getOne(MAIN_CONTAINER_MODULE_CLASS_NAME);
if (mainContainer == null) {
    return // some error handling
}

...
return (
  <div className="flex flex-col h-full">
    <MainContainer>
        {awesomeComponents.map((AwesomeComponent, index) => (
        <div key={index} className="flex w-full py-2 border-b">
            <AwesomeComponent someProp1="foo" someOtherProp=42 />
        </div>
        ))}
    </MainContainer>
  </div>
);
```

## Intended Integration

The module system is provided to child components via hooks, therefore a provider must be used like this:

```jsx
const activeModules = ...
...
return (
  <ModulesContext value={activeModules}>...</ModulesContext>
);
```

The standard implementation `ModulesProvider` makes this easier:

```jsx
<ModulesProvider>...</ModulesProvider>
```

## Sub Module Implementation Detail

This module is not consuming any sub-modules.
