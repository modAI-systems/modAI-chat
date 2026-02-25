"""
Chat2 Web Module: Interface for the responses endpoint.
Fully OpenAI /responses API compatible.
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter, Request, Body
from fastapi.responses import StreamingResponse
from typing import Any, AsyncGenerator
from modai.module import ModaiModule, ModuleDependencies
import openai


class ChatWebModule(ModaiModule, ABC):
    """
    Module Declaration for: Chat Responses (Web Module)

    Provides the /api/chat/raw/responses endpoint for chat completions.
    Fully OpenAI /responses API compatible.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route(
            "/api/chat/raw/responses",
            self.responses_endpoint,
            methods=["POST"],
            response_model=None,  # Disable response model since we return either Response or StreamingResponse
        )

    @abstractmethod
    async def responses_endpoint(
        self,
        request: Request,
        body_json: openai.types.responses.ResponseCreateParams = Body(...),
    ) -> openai.types.responses.Response | StreamingResponse:
        """
        Handles responses requests. Must be implemented by concrete implementations.
        Fully OpenAI /responses API compatible.

        Returns either:
        - OpenAIResponse (JSON) for non-streaming requests (stream=False or not set)
        - StreamingResponse for streaming requests (stream=True), where individual
          elements in the stream are ResponseStreamEvent objects serialized as
          Server-Sent Events (SSE) in the format: "data: {json}\n\n"
        """
        pass


class ChatLLMModule(ModaiModule, ABC):
    """
    Module Declaration for: Chat LLM Provider (Plain Module)

    Interface for LLM provider implementations (OpenAI, Ollama, etc.).
    Provides methods for generating chat responses with support for streaming.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    async def generate_response(
        self, request: Request, body_json: openai.types.responses.ResponseCreateParams
    ) -> (
        openai.types.responses.Response
        | AsyncGenerator[openai.types.responses.ResponseStreamEvent, None]
    ):
        """
        Generate a streaming or non-streaming chat response.

        Args:
            request: The FastAPI request object.
            body_json: The OpenAI-compatible create response request body.

        Returns:
            OpenAIResponse: For non-streaming responses, returns the complete response object.
            AsyncGenerator[OpenAIResponseStreamEvent, None]: For streaming responses, returns an async generator yielding response stream events.

        Callers can distinguish between the return types using isinstance:

        Example:
            ```python
            result = await generate_response(request, body_json)
            if isinstance(result, OpenAIResponse):
                # Handle non-streaming response
                handle_response(result)
            else:
                # Handle streaming response
                async for event in result:
                    handle_event(event)
            ```
        """
        pass
