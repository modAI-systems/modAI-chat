from fastapi import status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Request, Body
from typing import Any
from openai import AsyncOpenAI
import json

from modai.module import ModuleDependencies
from modai.modules.chat.module import (
    ChatModule,
    ChatRequest,
)


class OpenAIChatModule(ChatModule):
    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    async def chat_endpoint(self, request: Request, body_json: ChatRequest = Body(...)):
        from openai import AsyncOpenAI, APIStatusError

        openai_client_config = self.config.get("openai_client", {})

        # Handle input: if str, use as is; if list, use as messages
        if isinstance(body_json.input, str):
            input_items = body_json.input
        else:
            # For Responses API, messages should be in the format expected by the API
            input_items = body_json.input

        client = AsyncOpenAI(**openai_client_config)

        # Check for stream parameter in query params or body
        stream = (
            body_json.stream
            or request.query_params.get("stream", "false").lower() == "true"
        )

        if stream:
            return await self._stream_chat_response(
                client, body_json.model, input_items, body_json.model_dump()
            )
        else:
            return await self._non_stream_chat_response(
                client, body_json.model, input_items, body_json.model_dump()
            )

    async def _stream_chat_response(
        self,
        client: "AsyncOpenAI",
        model: str,
        input_items: str | list[dict],
        request_data: dict,
    ):
        """Handle streaming chat response with SSE"""
        from openai import APIStatusError

        async def generate_stream():
            try:
                # Prepare request data, remove stream
                req = request_data.copy()
                req.pop("stream", None)
                req["input"] = input_items
                req["stream"] = True

                stream = await client.responses.create(**req)

                async for event in stream:
                    if event.type == "response.output_text.delta" and event.delta:
                        content = event.delta
                        data = {"type": "response.output_text.delta", "delta": content}
                        yield f"data: {json.dumps(data)}\n\n"

                # Send end signal
                yield "data: [DONE]\n\n"

            except APIStatusError as e:
                error_data = {
                    "error": f"OpenAI API error: {getattr(e, 'response', str(e))}"
                }
                yield f"data: {json.dumps(error_data)}\n\n"
            except Exception as e:
                error_data = {"error": f"OpenAI API call failed: {str(e)}"}
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )

    async def _non_stream_chat_response(
        self,
        client: AsyncOpenAI,
        model: str,
        input_items: str | list[dict],
        request_data: dict,
    ):
        """Handle non-streaming chat response"""
        from openai import APIStatusError

        try:
            # Prepare request data
            req = request_data.copy()
            req.pop("stream", None)
            req["input"] = input_items

            response = await client.responses.create(**req)
        except APIStatusError as e:
            return JSONResponse(
                {"error": f"OpenAI API error: {getattr(e, 'response', str(e))}"},
                status_code=getattr(e, "status_code", 502),
            )
        except Exception as e:
            return JSONResponse(
                {"error": f"OpenAI API call failed: {str(e)}"},
                status_code=status.HTTP_502_BAD_GATEWAY,
            )

        return JSONResponse(response.model_dump())
