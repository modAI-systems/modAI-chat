"""
Realtime Web Module: Interface for the realtime WebSocket proxy endpoint.
"""

from abc import ABC, abstractmethod
from typing import Any

from fastapi import APIRouter, Query, WebSocket

from modai.module import ModaiModule, ModuleDependencies


class AudioRealtimeWebModule(ModaiModule, ABC):
    """
    Module Declaration for: Realtime WebSocket Proxy

    Exposes ``GET /api/realtime`` as a WebSocket endpoint.  The client
    connects here and exchanges OpenAI Realtime API events (JSON text frames).
    The backend opens a WebSocket to the configured LLM provider and proxies
    all frames in both directions, keeping the API key on the server.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_websocket_route(
            "/api/realtime",
            self.websocket_proxy,
        )

    @abstractmethod
    async def websocket_proxy(
        self,
        ws: WebSocket,
        model: str = Query(...),
    ) -> None:
        """
        Accept a client WebSocket, open a WebSocket to the LLM provider,
        and proxy all JSON events bidirectionally until either side closes.

        ``model`` query parameter format: ``<provider_name>/<model_name>``
        (e.g. ``myprovider/gpt-realtime-mini-2025-12-15``).
        """
        pass
