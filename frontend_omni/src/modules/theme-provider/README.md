# Theme System

Provides theme management functionality, including theme switching, theme persistence, and making theme state available throughout the application. It enables dynamic theming with support for multiple theme variants (e.g., light, dark, system preference).

## Intended Usage

```jsx
// Access theme functionality from any component
const { theme, setTheme, availableThemes } = useTheme();

// Display current theme
<p>Current theme: {theme}</p>

...
```

## Intended Integration

The theme system is provided to child components via the React Context API and hooks, therefore a provider must be used like this:

```jsx
const themeContextValue = ...
...
return (
  <ThemeContext value={themeContextValue}>...</ThemeContext>
);
```
