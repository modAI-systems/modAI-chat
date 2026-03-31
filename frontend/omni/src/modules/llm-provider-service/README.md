# LLM Provider Service

Manages the list of configured LLM providers and their available models.
Providers are persisted in `localStorage`. The service is browser-only and
makes API calls directly to the configured provider base URLs.
No UI components are available in this module group — see `llm-provider-management` for the management UI.

## Intended Usage

Other modules retrieve the active service via `getLLMProviderService()`.

```svelte
<script lang="ts">
  import { getLLMProviderService } from "@/modules/llm-provider-service/index.svelte.js";

  const llmProviderService = getLLMProviderService(); // called at component init

  // reactive: re-evaluates when provider list changes
  const providers = $derived(llmProviderService.getProviders());

  const models = await llmProviderService.fetchModels();
</script>
```

Modules that consume this service must declare a `module:llm-provider-service` dependency in `modules*.json`.

## API

### `getProviders(): Provider[]`

Returns the reactive list of configured providers. Use inside `$derived` or `$effect` to react to changes.

### `fetchModels(): Promise<ProviderModel[]>`

Fetches available models from all configured providers in parallel by calling each provider's `/models` endpoint. Unreachable providers are silently skipped.

### `checkProviderHealth(providerId): Promise<number>`

Checks the health of a provider by calling its `/health` endpoint. Returns the HTTP status code, `502` on network error, or `404` if the provider is not found.

### `createProvider(data: CreateProviderRequest): Provider`

Creates and persists a new provider. Throws if a provider with the same name already exists.

### `updateProvider(id, data): Provider`

Updates an existing provider. Throws if the provider is not found or the new name conflicts with another provider.

### `deleteProvider(id): void`

Removes a provider and persists the updated list.

## Intended Integration

The service is registered via the module system. The default implementation (`localStorageLLMProviderService.svelte.ts`) uses `localStorage` for persistence.

```json
{
  "id": "llm-provider-service",
  "type": "LLMProviderService",
  "path": "@/modules/llm-provider-service/localStorageLLMProviderService",
  "dependencies": []
}
```
