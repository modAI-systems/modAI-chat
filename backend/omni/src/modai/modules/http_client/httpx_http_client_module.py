"""httpx-backed implementation of :class:`HttpClientModule`."""

from contextlib import asynccontextmanager
from typing import Any, AsyncContextManager

import httpx

from modai.module import ModuleDependencies
from modai.modules.http_client.module import HttpClientModule


class HttpxHttpClientModule(HttpClientModule):
    """HTTP client factory backed by :class:`httpx.AsyncClient`."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    def new(self, timeout: float) -> AsyncContextManager[httpx.AsyncClient]:
        @asynccontextmanager
        async def _create():
            async with httpx.AsyncClient(timeout=timeout) as client:
                yield client

        return _create()
