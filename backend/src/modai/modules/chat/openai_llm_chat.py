from fastapi import Request
from typing import Any, AsyncGenerator
from openai import AsyncOpenAI, APIStatusError
from modai.module import ModuleDependencies
from .module import ChatLLMModule
from typing import Any
from openai.types.responses import (
    ResponseCreateParams as OpenAICreateResponse,
    Response as OpenAIResponse,
    ResponseStreamEvent as OpenAIResponseStreamEvent,
)


class OpenAILLMChatModule(ChatLLMModule):
    """
    OpenAI LLM Provider for Chat Responses.

    Implements the ChatLLMModule interface using OpenAI's Responses API.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    async def generate_response(
        self, _: Request, body_json: OpenAICreateResponse
    ) -> OpenAIResponse | AsyncGenerator[OpenAIResponseStreamEvent, None]:
        openai_client_config = self.config.get("openai_client", {})
        client = AsyncOpenAI(**openai_client_config)

        stream = body_json.get("stream", False)

        if stream:
            return self._generate_streaming_response(client, body_json)
        else:
            return await self._generate_non_streaming_response(client, body_json)

    async def _generate_streaming_response(
        self, client: AsyncOpenAI, body_json: OpenAICreateResponse
    ) -> AsyncGenerator[OpenAIResponseStreamEvent, None]:
        """Generate a streaming response."""
        try:
            # Ensure stream is True
            stream = await client.responses.create(**body_json)

            async for event in stream:
                yield event
        except APIStatusError as e:
            # For streaming, we might need to yield an error event
            # But for simplicity, raise for now
            raise e
        except Exception as e:
            raise e

    async def _generate_non_streaming_response(
        self, client: AsyncOpenAI, body_json: OpenAICreateResponse
    ) -> OpenAIResponse:
        """Generate a non-streaming response."""
        try:
            body_json.pop("stream", None)
            return await client.responses.create(**body_json)
        except APIStatusError as e:
            # Re-raise or handle as needed
            raise e
        except Exception as e:
            raise e
