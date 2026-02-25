# Strands Agents - Quick Start

## Installation

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Strands and tools
pip install strands-agents strands-agents-tools
```

## Basic Agent

```python
from strands import Agent

# Default Bedrock model
agent = Agent()
response = agent("What is the capital of France?")
print(response)
```

## Agent with Custom Model

```python
from strands import Agent
from strands.models import BedrockModel

agent = Agent(
    model=BedrockModel(model_id="us.anthropic.claude-sonnet-4-20250514-v1:0"),
    system_prompt="You are a helpful coding assistant. Be concise and provide examples."
)
result = agent("How do I read a JSON file in Python?")
print(result.message)
print(result.stop_reason)  # "end_turn", "max_tokens", etc.
print(result.metrics)  # Performance metrics
```

## Agent with Built-in Tools

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])
response = agent("What is the square root of 1764?")
```

## Agent with Initial State

```python
from strands import Agent

agent = Agent(
    messages=[
        {"role": "user", "content": [{"text": "My name is Alice"}]},
        {"role": "assistant", "content": [{"text": "Nice to meet you, Alice!"}]}
    ],
    state={"user_preference": "dark_mode"}
)
response = agent("What's my name?")  # Agent remembers: "Your name is Alice"
```

## Async Streaming

```python
from strands import Agent
import asyncio

async def stream_response():
    agent = Agent()
    async for event in agent.stream_async("Tell me a story"):
        if "data" in event:
            print(event["data"], end="", flush=True)

asyncio.run(stream_response())
```
