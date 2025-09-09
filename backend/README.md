# modAI REST Backend

Core technologies:

* FastAPI
* UV for dependency management

Architecture Documents:
* [Core Arhitecture](architecture/core.md)
* [AI Chat Handling](architecture/chat.md)

## Setup

To set up the development environment:

```bash
uv sync --dev
```

To run the application:

```bash
uv run uvicorn modai.main:app --reload
```

## Tests

To execute all tests, keys to the following external systems are needed:
* OpenAI API (API KEY)

If one or more of those keys are not provided, the corresponding tests will be skipped.

Run tests with:
```bash
uv run pytest
```

## 👥 Shared Responsibility

| Component | Responsibility |
|-----------|-------------------|
| Module Concept  | @guenhter |
| Config Handling | @guenhter and maybe you? |
| Chat Module     | @guenhter and maybe you? |
