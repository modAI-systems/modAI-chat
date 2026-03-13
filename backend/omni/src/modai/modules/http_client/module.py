"""HTTP client module interfaces.

Modules that need to make outbound HTTP requests should declare a dependency
on :class:`HttpClientModule` and use the factory to obtain a scoped client:

    async with self._http_client.new(timeout=10.0) as client:
        response = await client.request("GET", url)

This keeps HTTP-client instantiation out of business code and makes
units trivially testable without patching ``httpx.AsyncClient``.
"""

from abc import ABC, abstractmethod
from typing import Any, AsyncContextManager

import httpx

from modai.module import ModaiModule, ModuleDependencies


class HttpClientModule(ModaiModule, ABC):
    """Factory module for scoped HTTP clients.

    Usage::

        async with self._http_client.new(timeout=10.0) as client:
            response = await client.request("POST", url, json=payload)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    def new(self, timeout: float) -> AsyncContextManager[httpx.AsyncClient]:
        """Return an async context manager that yields a connected :class:`httpx.AsyncClient`."""
