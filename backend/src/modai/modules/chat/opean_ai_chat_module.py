from fastapi import status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Request, Body
from typing import Any, List
from openai import AsyncOpenAI
import json

from modai.module import ModuleDependencies
from modai.modules.chat.module import (
    ChatModule,
    ChatOutputMessage,
    ChatRequest,
    ChatResponse,
    ChatUsage,
)


class OpenAIChatModule(ChatModule):
    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    async def chat_endpoint(self, request: Request, body_json: ChatRequest = Body(...)):
        from openai import AsyncOpenAI, APIStatusError

        openai_client_config = self.config.get("openai_client", {})

        # Format messages for OpenAI
        messages = [
            {"role": msg.role, "content": msg.content} for msg in body_json.input
        ]
        if not messages:
            return JSONResponse(
                {"error": "No valid input messages provided."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        client = AsyncOpenAI(**openai_client_config)

        # Check for stream parameter in query params
        stream = request.query_params.get("stream", "false").lower() == "true"

        if stream:
            return await self._stream_chat_response(client, body_json.model, messages)
        else:
            return await self._non_stream_chat_response(
                client, body_json.model, messages
            )

    async def _stream_chat_response(
        self, client: "AsyncOpenAI", model: str, messages: List[dict[str, str]]
    ):
        """Handle streaming chat response with SSE"""
        from openai import APIStatusError

        async def generate_stream():
            try:
                stream = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.7,
                    max_completion_tokens=512,
                    stream=True,
                )

                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        data = {"content": content, "model": model, "type": "text"}
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
        self, client: AsyncOpenAI, model: str, messages: List[dict[str, str]]
    ):
        """Handle non-streaming chat response"""
        from openai import APIStatusError

        try:
            completion = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_completion_tokens=512,
            )
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

        # Extract response
        if not completion.choices:
            return JSONResponse(
                {"error": "No response from OpenAI."},
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        message = completion.choices[0].message
        output = [ChatOutputMessage(text=message.content or "").model_dump()]
        usage = completion.usage
        response = ChatResponse(
            output=output,
            id="1",
            model=completion.model,
            role=message.role,
            usage=ChatUsage(
                input_tokens=usage.prompt_tokens,
                output_tokens=usage.completion_tokens,
            ),
        )
        return JSONResponse(response.model_dump())
