# Instruction Updates from Corrections

This file tracks corrections provided by the user to improve future performance.

## Correction Template
### [Date] - [Context]
- **Mistake**: What went wrong?
- **Correction**: What was the correct way?
- **New Rule**: How to prevent this in the future? (Update `AGENTS.md` if necessary)

---

### 2026-03-04 - Testing philosophy: behavior over internals
- **Mistake**: Tests directly tested internal/private helper functions instead of public behavior.
- **Correction**: Tests must only exercise the public interface / exported API. Internal helpers are covered indirectly.
- **New Rule**: Only test public component behavior and exported functions. Never directly test internal helpers. Cover happy paths and error paths through the public API. Updated `AGENTS.md` frontend testing section.

### 2026-03-04 - Explicit user directive: no whitebox testing anywhere
- **Mistake**: Writing tests that target unexported helpers or assert on internal component state.
- **Correction**: All tests must go through the public/exported API only. If internal logic feels undertested, the fix is better public-API test cases, not exporting or directly calling internal code.
- **New Rule**: NO WHITEBOX TESTING. If you need to test internal logic, improve the public-API test coverage instead. Updated `AGENTS.md`.

### 2026-04-13 - Frontend services must be stateless
- **Mistake**: `SessionServiceImpl` stored mutable instance fields for session data instead of computing the active session on demand via `getActiveSession()`.
- **Correction**: Frontend services are **stateless** — the module system recreates service instances on each request, so any state stored on the instance is lost. Instead, `getActiveSession()` must compute and return the current session data directly, and callers must store the result in their own Svelte `$state` or local variables.
- **New Rule**: Frontend services MUST NOT hold mutable instance state. Methods such as `getActiveSession()` must return computed results directly rather than caching them on service fields. Callers own the state.
