from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="My Tool",
    version="1.0.0",
    description="Short description of the tool",
)


class MyRequest(BaseModel):
    """Define input parameters with Field descriptions — these become the tool's parameters for the LLM."""

    my_param: str = Field(description="Describe what this parameter does")


class MyResponse(BaseModel):
    """Define the response schema — the LLM sees this as the tool's output."""

    result: str


@app.post("/my-endpoint", operation_id="my_tool_name", summary="One-line description shown to the LLM")
async def my_endpoint(request: MyRequest) -> MyResponse:
    """Implement the tool logic here."""
    return MyResponse(result=f"You said: {request.my_param}")
