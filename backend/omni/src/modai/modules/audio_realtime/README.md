# Audio Realtime Module

## Interface

**Module type**: `AudioRealtimeWebModule` (Web Module — registers a FastAPI router)

**Endpoint**: `GET /api/realtime` (WebSocket upgrade)

The client opens a WebSocket to this endpoint and exchanges
[OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) events as JSON text frames.
The backend opens a second WebSocket to the configured LLM provider and proxies all
frames in both directions — the provider API key never leaves the server.

**Query parameter**: `model=<provider_name>/<model_name>` (required)
Example: `model=openai/gpt-4o-realtime-preview`

**Close codes**: `4000` bad request · `4001` unauthorized · `4004` provider not found ·
`4500` internal error.

---

## `OpenAIAudioRealtimeModule`

**Class**: `modai.modules.audio_realtime.openai_audio_realtime.OpenAIAudioRealtimeModule`

Resolves the provider by name from the `llm_provider_module` dependency, builds
the upstream `wss://` URL, and proxies all frames bidirectionally until either side closes.

### `config.yaml` snippet

```yaml
audio_realtime_router:
  class: modai.modules.audio_realtime.openai_audio_realtime.OpenAIAudioRealtimeModule
  module_dependencies:
    llm_provider_module: openai_model_provider   # required – any ModelProviderModule
    session: session                             # required – any SessionModule
```

