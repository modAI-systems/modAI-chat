---
name: strandagents
description: Comprehensive guide for Strands Agents SDK development with Python. Use when building AI agents with Strands, including OpenAI integration, custom tools, multi-agent systems, security, Docker deployment, testing, observability, and MCP server integration. Covers installation, configuration, best practices, and production deployment patterns.
---

# Strands Agents SDK

Strands Agents is a lightweight, model-driven Python SDK for building AI agents. It scales from simple conversational assistants to complex autonomous workflows with support for multiple LLM providers, custom tools, multi-agent systems, and production deployment.

## When to Use This Skill

Use this skill when:
- Building AI agents with Strands SDK
- Integrating OpenAI or other LLM providers
- Creating custom tools for agents
- Implementing multi-agent systems
- Deploying agents with Docker
- Setting up security and observability
- Integrating MCP servers
- Testing agent applications

## Quick Start

See [references/quickstart.md](references/quickstart.md) for installation and basic usage.

```python
from strands import Agent
from strands.models import OpenAIModel

# Create agent with OpenAI
model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": "your-api-key"}
)
agent = Agent(model=model)
response = agent("Hello, world!")
```

## Core Concepts

### Agent

The `Agent` class is the core component that orchestrates conversations with LLMs:

```python
from strands import Agent

agent = Agent(
    model=model,                    # LLM model provider
    system_prompt="...",            # System instructions
    tools=[...],                    # Available tools
    messages=[...],                 # Initial conversation history
    state={...},                    # Persistent state
    hooks=[...],                    # Lifecycle hooks
    conversation_manager=...,       # Context window management
    trace_attributes={...}          # OpenTelemetry attributes
)
```

### Models

Strands supports multiple LLM providers:
- **OpenAI**: `OpenAIModel` - See [references/openai.md](references/openai.md)
- **Anthropic**: `AnthropicModel`
- **Amazon Bedrock**: `BedrockModel` (default)
- **Google Gemini**: `GeminiModel`
- **Ollama**: `OllamaModel` (local)
- **LiteLLM**: `LiteLLMModel` (100+ providers)

### Tools

Custom tools extend agent capabilities. See [references/tools.md](references/tools.md) for complete guide.

```python
from strands import Agent, tool

@tool
def get_weather(city: str) -> dict:
    """Get weather for a city."""
    return {"status": "success", "content": [{"text": f"Sunny in {city}"}]}

agent = Agent(tools=[get_weather])
```

## Key Features

### 1. OpenAI Integration

See [references/openai.md](references/openai.md) for:
- API key configuration
- Model selection (gpt-4o, gpt-4o-mini, etc.)
- Parameters (temperature, max_tokens, etc.)
- Streaming responses
- Error handling
- Best practices

### 2. Custom Tools

See [references/tools.md](references/tools.md) for:
- Creating tools with `@tool` decorator
- Tool response format
- Context-aware tools
- Async tools
- Dynamic tool loading
- Built-in tools
- Best practices

### 3. Security

See [references/security.md](references/security.md) for:
- API key management (environment variables, vaults)
- Input validation
- Guardrails (AWS Bedrock, custom filters)
- Rate limiting
- Secure tool execution
- Logging best practices
- Vulnerability reporting

### 4. Docker Deployment

See [references/docker.md](references/docker.md) for:
- Dockerfile examples (basic, multi-stage, production)
- Docker Compose configurations
- Environment variables
- Secrets management
- Health checks
- Monitoring
- Resource limits
- Production checklist

### 5. Multi-Agent Systems

See [references/multi-agent.md](references/multi-agent.md) for:
- Agent as tool pattern
- Sequential workflows
- Parallel workflows
- Swarm pattern
- Hierarchical agents
- State sharing
- Communication patterns
- Best practices

### 6. Observability

See [references/observability.md](references/observability.md) for:
- OpenTelemetry integration
- Metrics (tokens, latency, etc.)
- Custom tracing
- Structured logging
- Hooks for monitoring
- Prometheus/CloudWatch integration
- Debugging techniques

### 7. Testing

See [references/testing.md](references/testing.md) for:
- Development environment setup
- Unit testing patterns
- Integration testing
- Testing hooks
- Mock models
- Async testing
- Code quality tools
- CI/CD integration
- Coverage reporting

### 8. MCP Integration

See [references/mcp.md](references/mcp.md) for:
- Connecting to MCP servers
- Tool filtering and prefixes
- Multiple servers
- MCP prompts and resources
- Popular MCP servers
- Error handling
- Best practices
- Custom MCP servers

## Development Workflow

### 1. Setup Environment

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install Strands
pip install strands-agents strands-agents-tools

# For development
hatch shell
pre-commit install -t pre-commit -t commit-msg
```

### 2. Create Agent

```python
from strands import Agent
from strands.models import OpenAIModel
import os

# Configure model
model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": os.environ.get("OPENAI_API_KEY")}
)

# Create agent
agent = Agent(
    model=model,
    system_prompt="You are a helpful assistant."
)
```

### 3. Add Tools

```python
from strands import tool

@tool
def my_tool(param: str) -> dict:
    """Tool description for LLM.
    
    Args:
        param: Parameter description.
    """
    return {"status": "success", "content": [{"text": f"Result: {param}"}]}

agent = Agent(model=model, tools=[my_tool])
```

### 4. Test

```bash
# Run tests
hatch test

# With coverage
hatch test -c

# Integration tests
hatch run test-integ
```

### 5. Deploy

See [references/docker.md](references/docker.md) for production deployment.

## Best Practices

### Security
- Never hardcode API keys - use environment variables
- Validate all tool inputs
- Implement rate limiting
- Use guardrails for content filtering
- Log securely (mask sensitive data)
- See [references/security.md](references/security.md)

### Tools
- Use clear docstrings (Google-style)
- Include type hints
- Return structured responses
- Handle errors gracefully
- Design for idempotency
- See [references/tools.md](references/tools.md)

### Multi-Agent
- Give agents clear responsibilities
- Avoid circular dependencies
- Limit delegation depth
- Handle failures gracefully
- Monitor performance
- See [references/multi-agent.md](references/multi-agent.md)

### Observability
- Use structured logging
- Set trace attributes
- Monitor token usage
- Implement health checks
- Export to monitoring systems
- See [references/observability.md](references/observability.md)

### Testing
- Write unit tests for tools
- Test with real models (integration)
- Mock external dependencies
- Test error handling
- Maintain high coverage
- See [references/testing.md](references/testing.md)

### Deployment
- Use multi-stage Docker builds
- Run as non-root user
- Set resource limits
- Configure health checks
- Use secrets management
- See [references/docker.md](references/docker.md)

## Common Patterns

### Conversational Agent

```python
from strands import Agent
from strands.models import OpenAIModel

model = OpenAIModel(model_id="gpt-4o")
agent = Agent(model=model, system_prompt="You are a helpful assistant.")

while True:
    user_input = input("You: ")
    if user_input.lower() == "exit":
        break
    response = agent(user_input)
    print(f"Agent: {response}")
```

### Agent with Tools

```python
from strands import Agent, tool
from strands.models import OpenAIModel

@tool
def calculate(expression: str) -> dict:
    """Evaluate mathematical expression."""
    result = eval(expression)
    return {"status": "success", "content": [{"text": str(result)}]}

model = OpenAIModel(model_id="gpt-4o")
agent = Agent(model=model, tools=[calculate])
response = agent("What is 15 * 23?")
```

### Streaming Agent

```python
from strands import Agent
from strands.models import OpenAIModel
import asyncio

async def stream():
    model = OpenAIModel(model_id="gpt-4o")
    agent = Agent(model=model)
    
    async for event in agent.stream_async("Tell me a story"):
        if "data" in event:
            print(event["data"], end="", flush=True)

asyncio.run(stream())
```

### Multi-Agent System

```python
from strands import Agent, tool
from strands.models import OpenAIModel

# Create specialist
specialist = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a research specialist."
)

# Wrap as tool
@tool
def research(query: str) -> dict:
    """Research a topic."""
    result = specialist(query)
    return {"status": "success", "content": [{"text": str(result)}]}

# Create coordinator
coordinator = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    tools=[research]
)

response = coordinator("Research AI trends")
```

## Troubleshooting

### API Key Issues
- Check environment variable: `echo $OPENAI_API_KEY`
- Verify key is valid and has credits
- Use `.env` file for local development

### Tool Not Called
- Ensure clear docstring describing tool purpose
- Check tool name doesn't conflict
- Verify tool returns correct format

### Memory Issues
- Use conversation manager to limit context
- Implement sliding window or summarization
- Clear messages periodically

### Performance Issues
- Monitor token usage via `result.metrics`
- Use smaller models for simple tasks
- Implement caching for repeated queries
- Use async tools for I/O operations

### Connection Errors
- Check network connectivity
- Verify API endpoint is accessible
- Implement retry logic with backoff

## Resources

### Documentation
- [Strands GitHub](https://github.com/strands-agents/sdk-python)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io/)

### Reference Files
- [quickstart.md](references/quickstart.md) - Installation and basic usage
- [openai.md](references/openai.md) - OpenAI integration
- [tools.md](references/tools.md) - Custom tools
- [security.md](references/security.md) - Security best practices
- [docker.md](references/docker.md) - Docker deployment
- [multi-agent.md](references/multi-agent.md) - Multi-agent systems
- [observability.md](references/observability.md) - Monitoring and telemetry
- [testing.md](references/testing.md) - Testing strategies
- [mcp.md](references/mcp.md) - MCP server integration

## Examples

### Production Agent

```python
import os
import logging
from strands import Agent, tool
from strands.models import OpenAIModel
from strands.telemetry import StrandsTelemetry
from strands.hooks import HookProvider, HookRegistry, AfterInvocationEvent

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup telemetry
StrandsTelemetry().setup_console_exporter().setup_otlp_exporter()

# Metrics hook
class MetricsHooks(HookProvider):
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AfterInvocationEvent, self.log_metrics)
    
    def log_metrics(self, event: AfterInvocationEvent) -> None:
        if event.result:
            logger.info(
                "tokens_in=<%d>, tokens_out=<%d>, latency_ms=<%d> | invocation completed",
                event.result.metrics.input_tokens,
                event.result.metrics.output_tokens,
                event.result.metrics.total_time
            )

# Custom tool
@tool
def process_data(data: str) -> dict:
    """Process data with validation."""
    if not data or len(data) > 1000:
        return {"status": "error", "content": [{"text": "Invalid data"}]}
    
    # Process
    result = data.upper()
    return {"status": "success", "content": [{"text": result}]}

# Create production agent
def create_agent():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    model = OpenAIModel(
        model_id="gpt-4o",
        client_args={"api_key": api_key},
        params={"temperature": 0.7, "max_tokens": 2048}
    )
    
    return Agent(
        model=model,
        tools=[process_data],
        hooks=[MetricsHooks()],
        trace_attributes={
            "environment": "production",
            "version": "1.0.0"
        }
    )

if __name__ == "__main__":
    agent = create_agent()
    response = agent("Process this data: hello world")
    print(response)
```

## Version Information

This skill is based on Strands Agents SDK Python documentation (latest as of January 2026). Check the [GitHub repository](https://github.com/strands-agents/sdk-python) for updates.
