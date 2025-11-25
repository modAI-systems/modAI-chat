# E2E Tests Best Practices

## Page Object Navigation Patterns

### goto() vs navigateTo()

**Use `goto()` when:**
- You want to navigate directly to a URL (same as `page.goto()`)
- You don't care about the application's navigation flow
- You're testing a specific page in isolation

```typescript
await llmProviderPage.goto(); // Direct URL navigation to /settings/global/llm-providers
```

**Use `navigateTo()` when:**
- You want to test the application's navigation flow
- You need to click through the UI (usually starting with the sidebar)
- You're testing user interactions and navigation paths

```typescript
await chatPage.navigateTo(); // Clicks through the application to reach the chat page
```

### Why This Matters

- **goto()**: Fast, direct navigation - good for isolated page testing
- **navigateTo()**: Tests actual user navigation paths - better for integration testing
- **Consistency**: Always use the appropriate method based on your testing goals
