import pytest
from unittest.mock import AsyncMock, MagicMock

from modai.module import ModuleDependencies
from modai.modules.model_provider.module import (
    ModelProviderResponse,
    ModelProvidersListResponse,
)
from modai.modules.audio_realtime.openai_audio_realtime import (
    OpenAIAudioRealtimeModule,
    _build_ws_url,
    _resolve_provider_and_model,
)
from modai.modules.session.module import SessionModule, Session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_provider(
    name: str = "llmgateway", base_url: str = "https://llmgateway.example.org/v1"
) -> ModelProviderResponse:
    return ModelProviderResponse(
        id="provider-1",
        type="openai",
        name=name,
        base_url=base_url,
        api_key="sk-test",
        properties={},
        created_at=None,
        updated_at=None,
    )


def _make_session_module(valid: bool = True) -> MagicMock:
    session_module = MagicMock(spec=SessionModule)
    if valid:
        session_module.validate_session.return_value = Session(
            user_id="test-user", additional={}
        )
    else:
        from modai.modules.session.module import InvalidSessionError

        session_module.validate_session.side_effect = InvalidSessionError("no session")
    return session_module


def _make_provider_module(providers: list[ModelProviderResponse]) -> MagicMock:
    from modai.modules.model_provider.module import ModelProviderModule

    provider_module = MagicMock(spec=ModelProviderModule)
    provider_module.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=providers, total=len(providers), limit=None, offset=None
        )
    )
    return provider_module


def _make_module(
    providers: list[ModelProviderResponse] | None = None,
    session_valid: bool = True,
) -> OpenAIAudioRealtimeModule:
    if providers is None:
        providers = [_make_provider()]

    session_module = _make_session_module(session_valid)
    provider_module = _make_provider_module(providers)

    mock_deps = MagicMock(spec=ModuleDependencies)
    mock_deps.get_module.side_effect = lambda name: (
        provider_module
        if name == "llm_provider_module"
        else session_module
        if name == "session"
        else None
    )

    return OpenAIAudioRealtimeModule(dependencies=mock_deps, config={})


def _make_upstream_mock(messages: list[str] | None = None) -> MagicMock:
    """Mock an upstream websockets connection that yields the given messages."""
    upstream = AsyncMock()
    upstream.send = AsyncMock()

    async def aiter_messages():
        for m in messages or []:
            yield m

    upstream.__aiter__ = lambda self: aiter_messages()
    upstream.__aenter__ = AsyncMock(return_value=upstream)
    upstream.__aexit__ = AsyncMock(return_value=False)
    return upstream


# ---------------------------------------------------------------------------
# URL construction tests
# ---------------------------------------------------------------------------


def test_build_ws_url_base_with_v1():
    assert _build_ws_url("https://api.openai.com/v1", "gpt-mini") == (
        "wss://api.openai.com/v1/realtime?model=gpt-mini"
    )


def test_build_ws_url_trailing_slash():
    assert _build_ws_url("https://api.openai.com/v1/", "gpt-mini") == (
        "wss://api.openai.com/v1/realtime?model=gpt-mini"
    )


def test_build_ws_url_http_becomes_ws():
    assert _build_ws_url("http://localhost:8080/v1", "gpt-mini") == (
        "ws://localhost:8080/v1/realtime?model=gpt-mini"
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint tests
# ---------------------------------------------------------------------------


def test_resolve_provider_and_model_simple():
    """Simple 'providerName/model' format resolves to the matching provider."""
    provider = _make_provider("llmgateway")
    result = _resolve_provider_and_model("llmgateway/gpt-realtime-mini", [provider])
    assert result is not None
    resolved_provider, model_name = result
    assert resolved_provider.name == "llmgateway"
    assert model_name == "gpt-realtime-mini"


def test_resolve_provider_and_model_compound():
    """Model names containing slashes are passed through unchanged after the provider prefix."""
    provider = _make_provider("llmgateway")
    result = _resolve_provider_and_model(
        "llmgateway/openai/gpt-realtime-mini-2025-12-15", [provider]
    )
    assert result is not None
    resolved_provider, model_name = result
    assert resolved_provider.name == "llmgateway"
    assert model_name == "openai/gpt-realtime-mini-2025-12-15"


def test_resolve_provider_and_model_no_match():
    """Returns None when no provider matches any path segment."""
    provider = _make_provider("llmgateway")
    result = _resolve_provider_and_model("openai/gpt-4o-realtime", [provider])
    assert result is None


def test_resolve_provider_and_model_no_slash():
    """Returns None for strings without a slash."""
    provider = _make_provider("llmgateway")
    assert _resolve_provider_and_model("gpt-realtime", [provider]) is None
    assert _resolve_provider_and_model("", [provider]) is None


def test_missing_llm_provider_module_raises_on_init():
    """Constructor raises ValueError when llm_provider_module dependency is missing."""
    mock_deps = MagicMock(spec=ModuleDependencies)
    mock_deps.get_module.return_value = None

    with pytest.raises(ValueError, match="llm_provider_module"):
        OpenAIAudioRealtimeModule(dependencies=mock_deps, config={})
