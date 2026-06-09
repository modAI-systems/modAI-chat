"""
OpenAI Realtime Module: WebSocket proxy for the OpenAI Realtime API.

Flow:
  1. Client connects to ``GET /api/realtime?model=<provider>/<model>`` via WebSocket.
  2. Backend validates the session, resolves the provider, and opens a WebSocket
     to the provider's realtime endpoint (``wss://…/v1/realtime?model=…``).
  3. All JSON events are proxied bidirectionally until either side closes.
  4. The provider's API key is never sent to the client.
"""

import asyncio
import logging
from typing import Any

import websockets
import websockets.exceptions
from fastapi import Query, WebSocket
from fastapi.websockets import WebSocketState

from modai.module import ModuleDependencies
from modai.modules.model_provider.module import ModelProviderModule
from modai.modules.audio_realtime.module import AudioRealtimeWebModule
from modai.modules.session.module import SessionModule

logger = logging.getLogger(__name__)

# WebSocket close codes (4000–4999 are application-defined)
_WS_BAD_REQUEST = 4000
_WS_UNAUTHORIZED = 4001
_WS_NOT_FOUND = 4004
_WS_INTERNAL_ERROR = 4500


class OpenAIAudioRealtimeModule(AudioRealtimeWebModule):
    """
    OpenAI/compatible implementation of the Realtime WebSocket proxy.

    Resolves the configured LLM provider by name and proxies all events
    between the client WebSocket and the provider's realtime WebSocket.

    No optional config keys at this time.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        self.provider_module: ModelProviderModule = dependencies.get_module(
            "llm_provider_module"
        )
        if not self.provider_module:
            raise ValueError(
                "OpenAIAudioRealtimeModule requires 'llm_provider_module' module dependency"
            )

        self.session_module: SessionModule = dependencies.get_module("session")
        if not self.session_module:
            raise ValueError(
                "OpenAIAudioRealtimeModule requires 'session' module dependency"
            )

    async def websocket_proxy(
        self,
        ws: WebSocket,
        model: str = Query(...),
    ) -> None:
        await ws.accept()

        try:
            self.session_module.validate_session(ws)
        except Exception:
            await ws.close(code=_WS_UNAUTHORIZED, reason="Unauthorized")
            return

        try:
            providers_response = await self.provider_module.get_providers(
                request=ws,
                limit=None,
                offset=None,
            )
        except Exception:
            logger.exception("Failed to retrieve providers")
            await ws.close(
                code=_WS_INTERNAL_ERROR, reason="Failed to retrieve providers"
            )
            return

        resolution = _resolve_provider_and_model(model, providers_response.providers)
        if not resolution:
            logger.warning("Realtime: no provider matched for model '%s'", model)
            await ws.close(
                code=_WS_NOT_FOUND,
                reason=f"No provider found for model '{model}'",
            )
            return
        provider, model_name = resolution

        if not provider.base_url:
            logger.warning(
                "Realtime: provider '%s' has no base_url configured", provider.name
            )
            await ws.close(
                code=_WS_NOT_FOUND,
                reason=f"Provider '{provider.name}' has no base_url configured",
            )
            return

        upstream_url = _build_ws_url(provider.base_url, model_name)
        headers = {"Authorization": f"Bearer {provider.api_key}"}
        logger.info("Realtime: connecting to upstream %s", upstream_url)

        try:
            async with websockets.connect(
                upstream_url, additional_headers=headers
            ) as upstream:
                logger.info("Realtime: upstream connected")
                await _proxy(ws, upstream)
                logger.info("Realtime: proxy finished")
        except websockets.exceptions.InvalidStatus as exc:
            logger.warning(
                "Realtime: upstream rejected with HTTP %s", exc.response.status_code
            )
        except Exception:
            logger.exception("Realtime WebSocket proxy error")
        finally:
            if ws.client_state != WebSocketState.DISCONNECTED:
                await ws.close()


async def _proxy(
    client: WebSocket,
    upstream: websockets.ClientConnection,
) -> None:
    """Proxy frames bidirectionally until either side closes."""

    async def client_to_upstream() -> None:
        try:
            while True:
                data = await client.receive_text()
                await upstream.send(data)
        except Exception:
            pass

    async def upstream_to_client() -> None:
        try:
            async for message in upstream:
                text = message if isinstance(message, str) else message.decode()
                await client.send_text(text)
        except Exception:
            pass
        finally:
            logger.info(
                "Realtime: upstream closed (code=%s reason=%r)",
                upstream.close_code,
                upstream.close_reason,
            )

    tasks = [
        asyncio.create_task(client_to_upstream()),
        asyncio.create_task(upstream_to_client()),
    ]
    _, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)


def _resolve_provider_and_model(
    model: str, providers: list
) -> tuple[object, str] | None:
    """
    Resolve a (provider, raw_model_name) pair from a model path string.

    The format is ``<providerName>/<modelName>`` where ``<modelName>`` may
    itself contain slashes (e.g. ``llmgateway/openai/gpt-4o-realtime``).
    Everything before the first ``/`` is matched against configured provider
    names; everything after becomes the raw model name forwarded upstream.
    """
    if not model or "/" not in model:
        return None
    provider_name, raw_model = model.split("/", 1)
    matched = next((p for p in providers if p.name == provider_name), None)
    return (matched, raw_model) if matched else None
    return None


def _build_ws_url(base_url: str, model_name: str) -> str:
    """Build the upstream WebSocket URL for the realtime endpoint.

    Converts ``https://`` → ``wss://`` (or ``http://`` → ``ws://``) and
    appends ``/realtime?model=<model_name>``.
    The ``base_url`` must already include the full path prefix (e.g. ``https://api.openai.com/v1``).
    """
    url = base_url.rstrip("/")
    url = url.replace("https://", "wss://").replace("http://", "ws://")
    return f"{url}/realtime?model={model_name}"
