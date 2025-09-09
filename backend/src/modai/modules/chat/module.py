"""
Chat Module: Provides a single non-streaming chat endpoint as per architecture spec.
- KISS: minimal, direct, raw JSON
- No over-engineered validation
- No streaming for now
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter
from fastapi import Request, Body
from typing import Any, List
from pydantic import BaseModel, Field
from modai.module import ModaiModule, ModuleDependencies


class ChatInputMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    provider: str
    model: str
    input: List[ChatInputMessage] = Field(default_factory=list)


class ChatOutputMessage(BaseModel):
    text: str
    type: str = "text"


class ChatUsage(BaseModel):
    input_tokens: int
    output_tokens: int


class ChatResponse(BaseModel):
    output: List[ChatOutputMessage]
    id: str
    model: str
    role: str
    usage: ChatUsage


class ChatModule(ModaiModule, ABC):
    """
    Module Declaration for: Chat (Web Module)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route("/api/v1/chat", self.chat_endpoint, methods=["POST"])

    @abstractmethod
    async def chat_endpoint(self, request: Request, body_json: ChatRequest = Body(...)):
        """
        Handles chat requests. Must be implemented by default implementation.
        """
        pass
