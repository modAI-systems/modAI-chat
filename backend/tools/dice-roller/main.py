import random

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Dice Roller Tool",
    version="1.0.0",
    description="Roll dice and get results",
)


class DiceRequest(BaseModel):
    count: int = Field(default=1, description="Number of dice to roll", ge=1, le=100)
    sides: int = Field(default=6, description="Number of sides per die", ge=2, le=100)


class DiceResponse(BaseModel):
    rolls: list[int]
    total: int


@app.post("/roll", operation_id="roll_dice", summary="Roll dice and return the results")
async def roll_dice(request: DiceRequest) -> DiceResponse:
    """Roll the specified number of dice with the given number of sides."""
    rolls = [random.randint(1, request.sides) for _ in range(request.count)]
    return DiceResponse(rolls=rolls, total=sum(rolls))
