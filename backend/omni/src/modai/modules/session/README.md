# Session Module

Handles session validation for every authenticated request. Other modules call `validate_session(request)` on their `session` dependency to obtain a `Session` object containing the caller's identity.

## Interface (`module.py`)

**Type**: Web Module + Session Module

**Endpoint provided**:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/userinfo` | Returns the active session or `401` if missing/invalid/expired |

**Data models**:

```python
@dataclass
class Session:
    user_id: str                  # stable user identity
    name: str | None              # display name from claims (may be None)
    additional: dict[str, Any]    # optional claims (email, name, email_verified, …)
```

**Contract for callers** — inject the session module as a dependency and call:

```python
session = self.session_module.validate_session(request)
# session.user_id    — the authenticated user's ID
# session.name       — display name (or None)
# session.additional — extra claims, may be empty
```

Raises `HTTPException(401)` when the request has no valid session.

---

## Implementations

### `oidc_session.OIDCSessionModule`

Validates stateless HS256-signed JWT cookies produced by `OIDCAuthModule`. No server-side session store is required — all state lives inside the signed cookie.

**Full configuration**:

```yaml
session:
  class: modai.modules.session.oidc_session.OIDCSessionModule
  config:
    session_secret: ${SESSION_SECRET}   # required — HS256 signing key
    session_duration: 86400             # optional, seconds, default 24 h
```

**Dependencies**: none

---

### `dev_mock_session.DevMockSessionModule`

> ⚠️ **Development only.** Automatically removed from Docker images. Never use in production.

Bypasses all authentication. Every request is treated as the statically configured user. Useful for local development without an identity provider.

**Full configuration**:

```yaml
session:
  class: modai.modules.session.dev_mock_session.DevMockSessionModule
  config:
    user_id: "dev-user"        # required — returned as session.user_id for every request
    email: "dev@example.com"   # optional — included in session.additional
    name: "Dev User"           # optional — included in session.additional
```

**Dependencies**: none
