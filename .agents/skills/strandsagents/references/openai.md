# OpenAI Integration

## Basic Configuration

```python
from strands import Agent
from strands.models import OpenAIModel

# OpenAI with API key
openai_model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": "your-openai-api-key"},
    params={"temperature": 0.7, "max_tokens": 2048}
)
agent = Agent(model=openai_model)
response = agent("Hello, how are you?")
```

## Environment Variables

Set your API key via environment variable:

```bash
export OPENAI_API_KEY="your-openai-api-key"
```

Then use without explicit key:

```python
from strands import Agent
from strands.models import OpenAIModel

openai_model = OpenAIModel(
    model_id="gpt-4o",
    params={"temperature": 0.7, "max_tokens": 2048}
)
agent = Agent(model=openai_model)
```

## Available Models

- `gpt-4o` - Latest GPT-4 Optimized
- `gpt-4o-mini` - Faster, cost-effective
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-3.5-turbo` - Fast and efficient

## Model Parameters

```python
openai_model = OpenAIModel(
    model_id="gpt-4o",
    params={
        "temperature": 0.7,      # 0.0-2.0, controls randomness
        "max_tokens": 2048,      # Maximum response length
        "top_p": 0.9,            # Nucleus sampling
        "frequency_penalty": 0,  # -2.0 to 2.0
        "presence_penalty": 0    # -2.0 to 2.0
    }
)
```

## Streaming Responses

```python
from strands import Agent
from strands.models import OpenAIModel
import asyncio

async def stream_openai():
    openai_model = OpenAIModel(
        model_id="gpt-4o",
        client_args={"api_key": "your-openai-api-key"}
    )
    agent = Agent(model=openai_model)
    
    async for event in agent.stream_async("Tell me a story"):
        if "data" in event:
            print(event["data"], end="", flush=True)

asyncio.run(stream_openai())
```

## With Custom Tools

```python
from strands import Agent, tool
from strands.models import OpenAIModel

@tool
def get_weather(city: str) -> dict:
    """Get weather for a city."""
    return {
        "status": "success",
        "content": [{"text": f"Weather in {city}: Sunny, 22°C"}]
    }

openai_model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": "your-openai-api-key"}
)
agent = Agent(model=openai_model, tools=[get_weather])
response = agent("What's the weather in Paris?")
```

## Error Handling

```python
from strands import Agent
from strands.models import OpenAIModel

try:
    openai_model = OpenAIModel(
        model_id="gpt-4o",
        client_args={"api_key": "your-openai-api-key"}
    )
    agent = Agent(model=openai_model)
    response = agent("Hello!")
except Exception as e:
    print(f"Error: {e}")
```

## Best Practices

1. **API Key Security**: Never hardcode API keys. Use environment variables or secure vaults.
2. **Rate Limits**: OpenAI has rate limits. Implement retry logic for production.
3. **Cost Management**: Monitor token usage via `result.metrics` to control costs.
4. **Model Selection**: Use `gpt-4o-mini` for cost-effective tasks, `gpt-4o` for complex reasoning.
5. **Temperature**: Lower (0.0-0.3) for deterministic outputs, higher (0.7-1.0) for creative tasks.
