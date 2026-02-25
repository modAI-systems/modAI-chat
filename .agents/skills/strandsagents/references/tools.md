# Custom Tools

## Creating Tools with @tool Decorator

### Basic Tool

```python
from strands import Agent, tool

@tool
def word_count(text: str) -> int:
    """Count words in text.
    
    This docstring is used by the LLM to understand the tool's purpose.
    """
    return len(text.split())

agent = Agent(tools=[word_count])
response = agent("How many words are in this sentence?")
```

### Tool with Multiple Parameters

```python
from strands import tool

@tool
def get_weather(city: str, units: str = "celsius") -> dict:
    """Get current weather for a city.
    
    Args:
        city: Name of the city to get weather for.
        units: Temperature units, either 'celsius' or 'fahrenheit'.
    
    Returns:
        Weather data including temperature and conditions.
    """
    # Simulated weather API call
    weather_data = {"city": city, "temperature": 22, "units": units, "conditions": "sunny"}
    return {
        "status": "success",
        "content": [{"text": f"Weather in {city}: {weather_data['temperature']}°{units[0].upper()}, {weather_data['conditions']}"}]
    }
```

### Tool Response Format

Tools should return a dict with this structure:

```python
{
    "status": "success",  # or "error"
    "content": [
        {"text": "Response text here"}
    ]
}
```

## Context-Aware Tools

Access agent state and context:

```python
from strands import Agent, tool
from strands.types.tools import ToolContext

@tool(context=True)
def save_note(note: str, tool_context: ToolContext) -> dict:
    """Save a note to the agent's state.
    
    Args:
        note: The note content to save.
    """
    agent = tool_context.agent
    if "notes" not in agent.state:
        agent.state["notes"] = []
    agent.state["notes"].append(note)
    return {"status": "success", "content": [{"text": f"Note saved: {note}"}]}

agent = Agent(tools=[save_note])
agent("Save a note: Remember to call mom")
print(agent.state["notes"])  # ['Remember to call mom']
```

## Async Tools

For non-blocking operations:

```python
from strands import tool
import aiohttp

@tool
async def fetch_url(url: str) -> dict:
    """Fetch content from a URL asynchronously.
    
    Args:
        url: The URL to fetch.
    """
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            content = await response.text()
            return {"status": "success", "content": [{"text": content[:500]}]}
```

## Direct Tool Invocation

Call tools directly without agent:

```python
from strands import Agent, tool

@tool
def calculate(expression: str) -> dict:
    """Evaluate a mathematical expression."""
    result = eval(expression)
    return {"status": "success", "content": [{"text": str(result)}]}

agent = Agent(tools=[calculate])

# Direct invocation
result = agent.tool.calculate(expression="2 + 2")
print(result)
```

## Dynamic Tool Loading

Load tools from directory with hot reloading:

```python
from strands import Agent

# Enable hot reloading from ./tools/ directory
agent = Agent(load_tools_from_directory=True)

# Create tools/my_tool.py:
# from strands import tool
#
# @tool
# def my_dynamic_tool(param: str) -> dict:
#     """A dynamically loaded tool."""
#     return {"status": "success", "content": [{"text": f"Processed: {param}"}]}

# Agent automatically detects and loads tools
response = agent("Use my_dynamic_tool with param='hello'")

# List available tools
print(f"Available tools: {agent.tool_names}")
```

## Built-in Tools

Use pre-built tools from strands-agents-tools:

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])
response = agent("What is the square root of 1764?")
```

## Tool Best Practices

### 1. Clear Docstrings

Use Google-style docstrings for LLM understanding:

```python
@tool
def example_function(param1: str, param2: int) -> dict:
    """Brief description of function.
    
    Longer description if needed. This docstring is used by LLMs
    to understand the function's purpose when used as a tool.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    
    Raises:
        ValueError: When invalid input is provided
    """
    pass
```

### 2. Type Hints

Always include type hints for parameters and return values.

### 3. Error Handling

Return error status for failures:

```python
@tool
def risky_operation(data: str) -> dict:
    """Perform a risky operation."""
    try:
        result = process(data)
        return {"status": "success", "content": [{"text": result}]}
    except Exception as e:
        return {"status": "error", "content": [{"text": f"Error: {str(e)}"}]}
```

### 4. Idempotency

Design tools to be safely retried without side effects.

### 5. Performance

Use async tools for I/O-bound operations to avoid blocking.
