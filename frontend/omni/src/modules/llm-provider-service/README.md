# LLM Provider Service

Manages LLM provider CRUD operations, model discovery, and provider health checks.
Persists providers to `localStorage`. No UI components available in this module group.

## Intended Usage

Other modules retrieve the provider service instance directly from the default export. It provides reactive state for the list of providers and methods to manage them.

```svelte
<script lang="ts">
  import llmProviderService from "@/modules/llm-provider-service/index.svelte.ts";

  const models = await llmProviderService.fetchModels();
</script>
```

## API

### Properties

- `providers: Provider[]` — reactive list of configured providers

### Methods

- `fetchModels(): Promise<ProviderModel[]>` — fetch models from all providers in parallel; unreachable providers are silently skipped
- `createProvider(request: CreateProviderRequest): Provider` — add a new provider
- `updateProvider(id: string, request: CreateProviderRequest): Provider` — update an existing provider
- `deleteProvider(id: string): void` — remove a provider
- `checkProviderHealth(provider: Provider): Promise<boolean>` — check if a provider is reachable

### Key Types

- `Provider` — `{ id, name, base_url, api_key, created_at, updated_at }`
- `ProviderModel` — `{ providerId, providerName, providerBaseUrl, providerApiKey, modelId, modelName, selectId }`
- `CreateProviderRequest` — `{ name, base_url, api_key }`
