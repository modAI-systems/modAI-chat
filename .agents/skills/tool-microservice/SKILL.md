---
name: tool-microservice
description: How to create a new tool microservice for modAI-chat. Tools are independent HTTP microservices that expose an OpenAPI spec and a trigger endpoint. They are registered in modAI's tool registry via config.yaml.
---

# Creating a Tool Microservice

## Overview

In modAI-chat, tools are **independent microservices** — not modAI modules. Each tool is a standalone HTTP service that:

1. Exposes a **trigger endpoint** (any HTTP method) that performs the tool's action
2. Serves an **OpenAPI spec** at `/openapi.json` describing the trigger endpoint
3. Has **no dependency on modAI** — it can be written in any language/framework

The modAI Tool Registry discovers tools by fetching their OpenAPI spec and uses the `operationId` as the tool's function name.

## Requirements

A valid tool microservice MUST:

- **Serve `/openapi.json`** at the service root (e.g. `http://my-tool:8000/openapi.json`)
- **Have exactly one trigger operation** with an `operationId` field — this becomes the tool's name in the LLM
- **Use `summary` or `description`** on the operation — this becomes the tool's description shown to the LLM
- **Define request body schema** under `requestBody.content.application/json.schema` — this becomes the tool's parameters
- **Return JSON responses** with appropriate status codes

## Step-by-Step Guide

### 1. Create the Microservice

Tools live under `backend/tools/<tool-name>/`. Each tool needs a `pyproject.toml` and a `main.py`.

Use the Python template files as a starting point:
- [references/pyproject.toml](references/pyproject.toml) — minimal UV project definition
- [references/main.py](references/main.py) — FastAPI app template with request/response models

Copy them into your tool directory, rename classes/endpoints, and implement your logic. FastAPI automatically generates the `/openapi.json` spec from the route definition.

A working example is available at `backend/tools/dice-roller/`.

**Run the tool:**

```bash
cd backend/tools/<tool-name>
uv sync
uv run uvicorn main:app --port <port>
```

### 2. Verify the OpenAPI Spec

Start the service and check that `/openapi.json` contains:

- `operationId` — unique name for the tool (e.g. `"roll_dice"`)
- `summary` or `description` — what the tool does (shown to the LLM)
- `requestBody.content.application/json.schema` — input parameters

```bash
curl http://localhost:8001/openapi.json | jq '.paths'
```

The dice roller produces this structure:

```json
{
  "/roll": {
    "post": {
      "summary": "Roll dice and return the results",
      "operationId": "roll_dice",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/DiceRequest"
            }
          }
        }
      }
    }
  }
}
```

### 3. Register in modAI config.yaml

Add the tool to the `tool_registry` module's `tools` list in `config.yaml` (and `default_config.yaml` if it should be a default):

```yaml
modules:
  tool_registry:
    class: modai.modules.tools.tool_registry.HttpToolRegistryModule
    config:
      tools:
        - url: http://localhost:8001/roll
          method: POST
```

Each entry has:
- **`url`**: The full trigger endpoint URL (not the base URL)
- **`method`**: The HTTP method to invoke the tool (POST, PUT, GET, etc.)

The registry derives the base URL from `url` (strips the path) and appends `/openapi.json` to fetch the spec.

### 4. Test the Integration

1. Start the tool microservice
2. Start modAI backend
3. Call `GET /api/tools` and verify your tool appears in OpenAI function-calling format:

```bash
curl http://localhost:8000/api/tools | jq '.tools[] | select(.function.name == "roll_dice")'
```

Expected:

```json
{
  "type": "function",
  "function": {
    "name": "roll_dice",
    "description": "Roll dice and return the results",
    "parameters": { ... },
    "strict": true
  }
}
```

## Key Conventions

| Aspect | Convention |
|---|---|
| OpenAPI spec location | `/openapi.json` at service root |
| Tool name | `operationId` from the OpenAPI spec |
| Tool description | `summary` (preferred) or `description` from the operation |
| Parameters | `requestBody.content.application/json.schema` |
| HTTP method | Choose what's idiomatic (POST for actions, GET for queries, etc.) |
| Error handling | Return appropriate HTTP status codes; modAI logs warnings for unreachable tools |

## Common Pitfalls

- **Missing `operationId`**: The tool will be silently skipped. Always set `operationId` on your trigger operation.
- **Wrong URL in config**: The `url` must be the full trigger endpoint (e.g. `http://localhost:8001/roll`), not just the base URL. The registry strips the path to derive the base for fetching `/openapi.json`.
- **Multiple operations**: The registry uses the **first** operation with an `operationId` it finds. Keep one trigger operation per tool service.
- **Non-JSON responses**: The LLM expects JSON results. Always return `application/json`.

## Architecture Reference

See `backend/omni/docs/architecture/tools.md` for the full tools architecture including the registry module, web module, and chat agent integration.
