from fastapi import APIRouter, Request, Body
from fastapi.responses import StreamingResponse
from typing import Any, Dict
from modai.module import ModuleDependencies
from .module import ChatLLMModule, ChatWebModule
import openai


class ChatWebModule(ChatWebModule):
    """
    Chat Router Module: Routes chat requests to appropriate LLM modules based on model prefix.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route(
            "/api/v1/responses", self.responses_endpoint, methods=["POST"]
        )
        clients_config = config.get("clients", {})
        self.clients: Dict[str, ChatLLMModule] = {}
        for prefix, module_name in clients_config.items():
            module = dependencies.get_module(module_name)
            if module:
                self.clients[prefix] = module
            else:
                raise ValueError(
                    f"Module '{module_name}' not found in dependencies for prefix '{prefix}'"
                )

    async def responses_endpoint(
        self,
        request: Request,
        body_json: openai.types.responses.ResponseCreateParams = Body(...),
    ) -> Any:
        """
        Routes the chat request to the appropriate LLM module based on the model prefix.
        """
        model = body_json.model
        prefix = model.split("/")[0]

        if prefix not in self.clients:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                {"error": f"No client configured for model prefix '{prefix}'"},
                status_code=400,
            )

        # Remove prefix from model for the actual module
        body_json.model = model[len(prefix) + 1 :] if "/" in model else model

        # Delegate to the appropriate module
        result = await self.clients[prefix].generate_response(request, body_json)

        if isinstance(result, openai.types.responses.Response):
            return result
        else:
            # Streaming response
            async def generate_sse():
                async for event in result:
                    yield f"data: {event.model_dump_json()}\n\n"
            return StreamingResponse(generate_sse(), media_type="text/event-stream")
