from fastapi import Request
from typing import Any, AsyncGenerator
from openai import AsyncOpenAI, APIStatusError
from modai.module import ModuleDependencies
from .module import ChatLLMModule
from openai.types.responses import (
    ResponseCreateParams as OpenAICreateResponse,
    Response as OpenAIResponse,
    ResponseStreamEvent as OpenAIResponseStreamEvent,
)
from modai.modules.model_provider.module import ModelProviderModule


class OpenAILLMChatModule(ChatLLMModule):
    """
    OpenAI LLM Provider for Chat Responses.

    Implements the ChatLLMModule interface using OpenAI's Responses API.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get the LLM provider module dependency (key from module_dependencies in config.yaml)
        self.provider_module: ModelProviderModule = dependencies.get_module(
            "llm_provider_module"
        )

        if not self.provider_module:
            raise ValueError(
                "OpenAILLMChatModule requires 'llm_provider_module' module dependency"
            )

    async def generate_response(
        self, request: Request, body_json: OpenAICreateResponse
    ) -> OpenAIResponse | AsyncGenerator[OpenAIResponseStreamEvent, None]:
        # Parse model: format is "provider_name/model_name"
        model = body_json.get("model", "")
        model_parts = model.split("/")
        if len(model_parts) != 2:
            raise ValueError(
                f"Invalid model format: {model}. Expected 'provider_name/model_name'"
            )

        provider_name, actual_model = model_parts

        # Get all providers from the provider module
        providers_response = await self.provider_module.get_providers(
            limit=None, offset=None
        )
        provider = None
        for p in providers_response.providers:
            if p.name == provider_name:
                provider = p
                break

        if not provider:
            raise ValueError(f"Provider '{provider_name}' not found")

        # Create OpenAI client with the provider's API key and base URL
        client = AsyncOpenAI(
            api_key=provider.api_key,
            base_url=provider.base_url if provider.base_url else None,
        )

        # Update body_json with the actual model
        body_json["model"] = actual_model

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
