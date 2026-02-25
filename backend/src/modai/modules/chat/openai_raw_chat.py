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
from modai.modules.model_provider.module import (
    ModelProviderModule,
    ModelProviderResponse,
)


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
        provider_name, actual_model = self._parse_model(body_json.get("model", ""))
        provider = await self._resolve_provider(request, provider_name)
        client = self._create_client(provider)

        body_json["model"] = actual_model

        if body_json.get("stream", False):
            return self._generate_streaming_response(client, body_json)
        else:
            return await self._generate_non_streaming_response(client, body_json)

    def _parse_model(self, model: str) -> tuple[str, str]:
        """Parse 'provider_name/model_name' into its components."""
        model_parts = model.split("/", maxsplit=1)
        if len(model_parts) != 2 or not model_parts[0] or not model_parts[1]:
            raise ValueError(
                f"Invalid model format: {model}. Expected 'provider_name/model_name'"
            )
        return model_parts[0], model_parts[1]

    async def _resolve_provider(
        self, request: Request, provider_name: str
    ) -> ModelProviderResponse:
        """Look up the provider by name from the provider module."""
        providers_response = await self.provider_module.get_providers(
            request=request, limit=None, offset=None
        )
        for p in providers_response.providers:
            if p.name == provider_name:
                return p
        raise ValueError(f"Provider '{provider_name}' not found")

    def _create_client(self, provider: ModelProviderResponse) -> AsyncOpenAI:
        """Create an AsyncOpenAI client from a provider configuration."""
        return AsyncOpenAI(
            api_key=provider.api_key,
            base_url=provider.base_url if provider.base_url else None,
        )

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
