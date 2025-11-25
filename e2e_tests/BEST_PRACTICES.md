# E2E Tests Best Practices

## Page Object Model Usage

Page objects should always be used where possible, as recommended by the [Playwright Page Object Model documentation](https://playwright.dev/docs/pom). Page objects represent parts of your web application and encapsulate common operations, element selectors, and assertions into a higher-level API. This simplifies test authoring, improves maintainability, and reduces code duplication.

### What Should Go into a Page Function

Page functions should encapsulate actions, assertions, and navigation logic related to a specific page or component. Examples include:

- **Actions**: Methods that perform user interactions, such as filling forms, clicking buttons, or navigating.
  ```typescript
  async addProvider(name: string, baseUrl: string, apiKey: string) {
      await this.page.getByText("Add Provider", { exact: true }).click();
      await this.page.getByLabel("Provider Name", { exact: true }).fill(name);
      await this.page.getByLabel("Base URL", { exact: true }).fill(baseUrl);
      await this.page.getByLabel("API Key", { exact: true }).fill(apiKey);
      await this.page.getByText("Create Provider", { exact: true }).click();
  }
  ```

- **Assertions**: Methods that verify expected states or elements on the page.
  ```typescript
  async assertProviderExists(providerName: string, baseUrl?: string) {
      await expect(this.page.getByText(providerName, { exact: true })).toBeVisible();
      if (baseUrl) {
          await this.page.getByText(providerName, { exact: true }).click();
          await expect(this.page.locator(`input[value="${baseUrl}"]`)).toBeVisible();
      }
  }
  ```

- **Navigation**: Methods for navigating to the page, either directly or through the UI.
  ```typescript
  async goto() {
      await this.page.goto("/settings/global/llm-providers");
  }

  async navigateTo() {
      await this.page.getByText("Global Settings", { exact: true }).click();
      await this.page.getByText("LLM Providers", { exact: true }).click();
      await expect(this.page).toHaveURL("/settings/global/llm-providers");
  }
  ```

### How Tests Should Use Page Objects

Tests should instantiate the page object and call its methods instead of directly interacting with the `page` object. This promotes reusability and keeps tests focused on high-level behavior.

```typescript
test("should save llm provider", async ({ page }) => {
    const llmProviderPage = new LLMProvidersPage(page);

    await llmProviderPage.goto();
    await llmProviderPage.addProvider("Test Provider", "http://localhost:3001", "test-api-key");
    await llmProviderPage.assertProviderAddedSuccessfully("Test Provider");
});
```

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

By following this pattern, tests become more readable, easier to maintain, and less prone to breaking when UI changes occur.
