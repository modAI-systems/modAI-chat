"""
Chat Module: Provides responses endpoint using OpenAI Responses API.
- Based on OpenAI Responses API interface
- Supports streaming and non-streaming
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter
from fastapi import Request, Body
from typing import Any, List, Dict, Union, Optional
from pydantic import BaseModel, Field
from enum import Enum
from modai.module import ModaiModule, ModuleDependencies
from modai.openapi_models import (
    Response1 as OpenAIResponse,
    ResponseUsage as OpenAIUsage,
)


class ChatRequest(BaseModel):
    model: str
    input: Union[str, List[Dict[str, Any]]] = Field(default_factory=list)
    instructions: Optional[str] = None
    temperature: Optional[float] = None
    max_output_tokens: Optional[int] = None
    stream: Optional[bool] = None


# Use generated OpenAI types
ChatUsage = OpenAIUsage
ChatResponse = OpenAIResponse


class ChatModule(ModaiModule, ABC):
    """
    Module Declaration for: Responses (Web Module)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route(
            "/api/v1/responses", self.chat_endpoint, methods=["POST"]
        )

    @abstractmethod
    async def chat_endpoint(self, request: Request, body_json: ChatRequest = Body(...)):
        """
        Handles chat requests. Must be implemented by default implementation.
        """
        pass
