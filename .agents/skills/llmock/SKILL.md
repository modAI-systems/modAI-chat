---
name: llmock-skill
description: >-
  Run and configure llmock via Docker, an OpenAI-compatible mock server for
  testing LLM integrations. Use when you need a local mock for OpenAI endpoints
  (/models, /chat/completions, /responses), when testing tool calling,
  error handling, or streaming against a deterministic server, or when
  configuring mock behaviors via config.yaml and Docker environment variables.
license: MIT
metadata:
  author: modAI-systems
  version: "0.0.1"
---

# llmock — OpenAI-Compatible Mock Server (Docker)

llmock is a lightweight Docker-based mock server that implements OpenAI's API. It lets you test LLM integrations without hitting a real API. By default it echoes input back as output (mirror strategy), and supports config-driven tool calls, error simulation, and streaming.

## When to Use This Skill

- You need a local OpenAI-compatible server for integration tests
- You want deterministic, reproducible responses from an "LLM"
- You need to test tool calling, error handling, or streaming logic
- You want to avoid API costs and rate limits during development

## Running with Docker

### Basic Start

```bash
docker container run -p 8000:8000 ghcr.io/modai-systems/llmock:latest
```

The server is available at `http://localhost:8000`. Health check: `GET /health` (no auth).

### With Custom Configuration

The container reads config from `/app/config.yaml`. Mount a local file to override:

```bash
docker container run -p 8000:8000 \
  -v ./config.yaml:/app/config.yaml:ro \
  ghcr.io/modai-systems/llmock:latest
```

### With Environment Variable Overrides

Override individual config values using `LLMOCK_`-prefixed environment variables:

```bash
docker container run -p 8000:8000 \
  -e LLMOCK_API_KEY=my-custom-key \
  -e LLMOCK_CORS_ALLOW_ORIGINS="http://localhost:3000;http://localhost:5173" \
  ghcr.io/modai-systems/llmock:latest
```

Environment variable rules:
- Nested keys joined with underscores: `cors.allow-origins` → `LLMOCK_CORS_ALLOW_ORIGINS`
- Dashes converted to underscores: `api-key` → `LLMOCK_API_KEY`
- Lists parsed from semicolon-separated values
- Only keys present in `config.yaml` are overridden

### Verify It's Running

```bash
curl http://localhost:8000/health
```

## Connecting an OpenAI Client

Point any OpenAI SDK client at the mock server. The default API key is `your-secret-api-key`.

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/",
    api_key="your-secret-api-key",
)
```

Any language's OpenAI SDK works — just change `base_url`.

## General Behavior

### Default: Mirror Strategy

Without any special config, llmock echoes the last user message back as the response. Send `"Hello!"` and get `"Hello!"` back.

### Strategy System

Strategies are an ordered list in `config.yaml`. They run in sequence; the **first strategy that returns a non-empty result wins**. Remaining strategies are skipped.

```yaml
strategies:
  - ErrorStrategy      # Check for error triggers first
  - ToolCallStrategy   # Then check for tool call matches
  - MirrorStrategy     # Fall back to echoing input
```

| Strategy | Behavior |
|----------|----------|
| `MirrorStrategy` | Echoes the last user message |
| `ToolCallStrategy` | Returns tool calls triggered by `call tool '<name>' with '<json>'` phrase in the last user message |
| `ErrorStrategy` | Returns HTTP errors triggered by `raise error <json>` phrase in the last user message |

If `strategies` is omitted, defaults to `["MirrorStrategy"]`. Unknown names are skipped with a warning.

### Model Validation

Requests must specify a model that exists in the `models` config list. Invalid models return a `404` error. Model validation runs **before** any strategy.

### Authentication

If `api-key` is set in config, clients must send `Authorization: Bearer <key>`. If `api-key` is not set, all requests are allowed. The `/health` endpoint never requires auth.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | GET | List configured models |
| `/models/{model_id}` | GET | Retrieve a single model |
| `/chat/completions` | POST | Chat Completions API (streaming supported) |
| `/responses` | POST | Responses API (streaming supported) |
| `/health` | GET | Health check (no auth required) |

Both `/chat/completions` and `/responses` support `stream=True` (SSE, word-level chunking) and `stream_options.include_usage` for usage stats.

## Configuration

The container reads `/app/config.yaml`. See [references/CONFIG.md](references/CONFIG.md) for the full field reference.

### Minimal Custom Config

```yaml
api-key: "test-key"
models:
  - id: "gpt-4o"
    created: 1715367049
    owned_by: "openai"
```

### Full Config with All Features

```yaml
api-key: "your-secret-api-key"

cors:
  allow-origins:
    - "http://localhost:8000"

models:
  - id: "gpt-4o"
    created: 1715367049
    owned_by: "openai"
  - id: "gpt-4o-mini"
    created: 1721172741
    owned_by: "openai"
  - id: "gpt-3.5-turbo"
    created: 1677610602
    owned_by: "openai"

strategies:
  - ErrorStrategy
  - ToolCallStrategy
  - MirrorStrategy
```

### Tool Calling

When `ToolCallStrategy` is in the strategies list, llmock scans the last user message line-by-line for the pattern:

```
call tool '<name>' with '<json>'
```

- `<name>` must match one of the tools declared in the request's `tools` list.
- `<json>` is the arguments string passed back as the tool call arguments (use `'{}'` for no arguments).
- Multiple matching lines each produce a separate tool call response.
- If no line matches, or the named tool is not in `request.tools`, the strategy returns an empty list and the next strategy runs.
- **The strategy only fires when the last message in the conversation is a `user` message.** If the last message has any other role (`assistant`, `tool`, `system`), the strategy is skipped entirely. This prevents the infinite loop that would otherwise occur when the trigger phrase persists in the conversation history across multiple cycles.

### Error Simulation

When `ErrorStrategy` is in the strategies list, llmock scans the last user message line-by-line for the pattern:

```
raise error {"code": 429, "message": "Rate limit exceeded"}
```

| Field | Required | Maps to |
|-------|----------|---------|
| `code` | yes (int) | HTTP response status code (e.g. `429`) |
| `message` | yes (string) | `error.message` in the JSON body |
| `type` | no (string) | `error.type` in the JSON body — defaults to `"api_error"` |
| `error_code` | no (string) | `error.code` in the JSON body — defaults to `"error"` |

Example with all fields:

```
raise error {"code": 429, "message": "Rate limit exceeded", "type": "rate_limit_error", "error_code": "rate_limit_exceeded"}
```

Produces HTTP 429 with body:

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "param": null,
    "code": "rate_limit_exceeded"
  }
}
```

- The phrase can appear anywhere in the message — the line is scanned, not the whole message.
- First matching line wins; remaining lines are ignored.
- If no line matches, the strategy returns an empty list and the next strategy runs.
- Works on both `/chat/completions` and `/responses`.

## Default Models

Out of the box, the container serves:

| Model ID | Created | Owner |
|----------|---------|-------|
| `gpt-4o` | 1715367049 | openai |
| `gpt-4o-mini` | 1721172741 | openai |
| `gpt-3.5-turbo` | 1677610602 | openai |

## Key Rules

1. **Mirror is the default** — without tool calls or error triggers, the server echoes the last user message.
2. **Strategy order matters** — first non-empty result wins; remaining strategies are skipped.
3. **Model must be valid** — model validation runs before strategies; unknown models → 404.
4. **Auth is optional** — no `api-key` in config = all requests allowed.
5. **Config path in Docker is `/app/config.yaml`** — mount with `-v ./config.yaml:/app/config.yaml:ro`.
6. **Use `docker container` syntax** — always `docker container run`, `docker container stop`, etc.
