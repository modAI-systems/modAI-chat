# Instruction Updates from Corrections

This file tracks corrections provided by the user to improve future performance.

## Correction Template
### [Date] - [Context]
- **Mistake**: What went wrong?
- **Correction**: What was the correct way?
- **New Rule**: How to prevent this in the future? (Update `AGENTS.md` if necessary)

---

### 2026-04-01 - module.py / impl split is always required
- **Mistake**: Collapsed `module.py` (ABC with route + abstract method) and the concrete impl into a single file.
- **Correction**: `module.py` always defines the abstract class: it registers the route(s) in `__init__` and declares each endpoint as `@abstractmethod`. The impl file (e.g. `reset_web_module.py`) inherits the abstract class and only implements the abstract methods — no route registration there.
- **New Rule**: Always split into `module.py` (abstract, route registration, abstract endpoint declarations) and a separate `<name>.py` impl. The `config.yaml` entry points to the impl, never to `module.py`.


---

### 2026-03-04 - Test structure for StrandsAgentChatModule
- **Mistake**: Tests imported and directly tested private/internal functions (e.g. `_resolve_request_tools`, `_parse_model`, `_extract_last_user_message`, `_create_http_tool`).
- **Correction**: Tests should only exercise the public interface (`__init__`, `generate_response`). Private helpers are tested indirectly through those public methods.
- **New Rule**: Only test public functions/behavior. Never import or directly test functions prefixed with `_`. Cover happy paths (streaming, non-streaming, tool calling) and error paths (LLM unreachable, LLM errors, tool not available, tool errors) through the public API. Updated `AGENTS.md` backend testing section.

### 2026-03-04 - No white-box assertions on internal state
- **Mistake**: Tests asserted on internal fields like `module.provider_module is not None` or `module.tool_registry is registry`.
- **Correction**: Tests should only verify observable behavior (e.g. construction succeeds/fails, method returns expected result), never assert on internal instance attributes.
- **New Rule**: Never assert on internal object fields/state in tests. Only verify behavior: does it raise? Does the return value match expectations? Does it produce the correct side-effects?

### 2026-03-04 - No `patch` in tests — use testcontainers + pytest-httpserver
- **Mistake**: Used `unittest.mock.patch` to spy on `_create_agent` and mock `httpx.Client` to test tool handler behaviour.
- **Correction**: `patch` must not be used. The file under test should be modular enough that all external dependencies can be configured. For the LLM side use an llmock testcontainer; for tool HTTP endpoints use `pytest-httpserver`.
- **New Rule**: Never use `patch`. For tool invocation tests, configure llmock with `ToolCallStrategy` and point `ToolDefinition.url` at a `pytest-httpserver` instance.

### 2026-03-04 - Explicit user directive: no whitebox testing anywhere
- **Mistake**: Writing tests that target individual private/internal functions to achieve coverage.
- **Correction**: All tests must exercise only the public interface. If internal logic needs coverage, improve public-API tests, not private-function tests.
- **New Rule**: NO WHITEBOX TESTING. Never test `_prefixed` functions or assert on private object state. A test that does so is incorrect by definition and must be rewritten to go through the public API. Updated `AGENTS.md`.

### 2026-03-13 - Injected metadata in tool params uses `_` prefix
- **Convention**: When the caller needs to pass transport-level metadata (e.g. bearer token) into `Tool.run`, inject it as a `_`-prefixed key in the `params` dict (e.g. `_bearer_token`). The implementation pops those keys before building the request body; they are never forwarded as JSON payload.
- **New Rule**: Any caller-injected, non-payload property passed via `params` MUST use a `_`-prefixed key. Document new keys in `docs/architecture/tools.md` under "Reserved `_`-prefixed keys".

- **Mistake**: Passed `base_url = f"{root_url}/v1"` — the updated llmock no longer mounts routes under `/v1`.
- **Correction**: All llmock endpoints are now at the root (`/chat/completions`, `/models`, `/health`). Pass `base_url = f"{root_url}/"` (trailing slash) so the OpenAI SDK does not append `/v1`.
- **New Rule**: Always use `base_url = "http://<host>:<port>/"` (trailing slash) when connecting to llmock. The SKILL.md has been updated.
