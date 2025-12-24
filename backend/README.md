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

### vscode

When using vscode to run tests in the editor, make sure to configure the root dir for pytests
properly in the `.vscode/settings.json`:

```json
{
    "python.testing.pytestArgs": [],
    "python.testing.unittestEnabled": false,
    "python.testing.pytestEnabled": true,
    "python.testing.cwd": "${workspaceFolder}/backend"
}
```

## Code Quality

To check code formatting with ruff:

```bash
uv run ruff format --check .
```

To automatically format code with ruff:

```bash
uv run ruff format .
```

## 👥 Shared Responsibility

| Component | Responsibility |
|-----------|-------------------|
| Module Concept  | @guenhter |
| Config Handling | @guenhter and maybe you? |
| Chat Module     | @guenhter and maybe you? |
