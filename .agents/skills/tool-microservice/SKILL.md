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

Use any HTTP framework. Example with Python FastAPI:

```python
from fastapi import FastAPI

app = FastAPI(
    title="Calculator Tool",
    version="1.0.0",
    description="Evaluate mathematical expressions",
)

@app.post("/calculate", operation_id="calculate", summary="Evaluate a math expression")
async def calculate(expression: str) -> dict:
    """Evaluate the given math expression and return the result."""
    result = eval(expression)  # Use a safe evaluator in production
    return {"result": result}
```

FastAPI automatically generates the `/openapi.json` spec from the route definition.

### 2. Verify the OpenAPI Spec

Start the service and check that `/openapi.json` contains:

- `operationId` — unique name for the tool (e.g. `"calculate"`)
- `summary` or `description` — what the tool does (shown to the LLM)
- `requestBody.content.application/json.schema` — input parameters

```bash
curl http://localhost:8000/openapi.json | jq '.paths'
```

Expected structure:

```json
{
  "/calculate": {
    "post": {
      "summary": "Evaluate a math expression",
      "operationId": "calculate",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "expression": {
                  "type": "string",
                  "description": "Math expression to evaluate"
                }
              },
              "required": ["expression"]
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
        - url: http://calculator-service:8000/calculate
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
curl http://localhost:8000/api/tools | jq '.tools[] | select(.function.name == "calculate")'
```

Expected:

```json
{
  "type": "function",
  "function": {
    "name": "calculate",
    "description": "Evaluate a math expression",
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
- **Wrong URL in config**: The `url` must be the full trigger endpoint (e.g. `/calculate`), not just the base URL. The registry strips the path to derive the base for fetching `/openapi.json`.
- **Multiple operations**: The registry uses the **first** operation with an `operationId` it finds. Keep one trigger operation per tool service.
- **Non-JSON responses**: The LLM expects JSON results. Always return `application/json`.

## Architecture Reference

See `backend/docs/architecture/tools.md` for the full tools architecture including the registry module, web module, and chat agent integration.
