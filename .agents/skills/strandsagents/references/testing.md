# Testing Strands Agents

## Development Environment

### Setup

```bash
# Enter dev environment
hatch shell

# Install pre-commit hooks
pre-commit install -t pre-commit -t commit-msg
```

### Run Tests

```bash
# Run unit tests
hatch test

# Run with coverage
hatch test -c

# Run integration tests
hatch run test-integ

# Test specific directory
hatch test tests/strands/agent/

# Test across all Python versions
hatch test --all
```

## Unit Testing

### Test File Structure

```
tests/strands/
├── agent/
│   ├── test_agent.py
│   └── test_conversation_manager.py
└── tools/
    └── test_tools.py
```

### Basic Agent Test

```python
# tests/strands/agent/test_agent.py
import pytest
from strands import Agent
from strands.models import BedrockModel

def test_agent_creation():
    """Test basic agent creation."""
    agent = Agent()
    assert agent is not None
    assert agent.messages == []

def test_agent_with_system_prompt():
    """Test agent with custom system prompt."""
    system_prompt = "You are a helpful assistant."
    agent = Agent(system_prompt=system_prompt)
    assert agent.system_prompt == system_prompt

def test_agent_with_state():
    """Test agent with initial state."""
    state = {"user_id": "123"}
    agent = Agent(state=state)
    assert agent.state["user_id"] == "123"
```

### Tool Testing

```python
# tests/strands/tools/test_tools.py
import pytest
from strands import tool

@tool
def test_tool(text: str) -> dict:
    """A test tool."""
    return {"status": "success", "content": [{"text": f"Processed: {text}"}]}

def test_tool_execution():
    """Test tool execution."""
    result = test_tool("hello")
    assert result["status"] == "success"
    assert "Processed: hello" in result["content"][0]["text"]

def test_tool_with_invalid_input():
    """Test tool with invalid input."""
    with pytest.raises(TypeError):
        test_tool(123)  # Should be string
```

### Async Tool Testing

```python
import pytest
import asyncio
from strands import tool

@tool
async def async_test_tool(data: str) -> dict:
    """An async test tool."""
    await asyncio.sleep(0.1)
    return {"status": "success", "content": [{"text": f"Async: {data}"}]}

@pytest.mark.asyncio
async def test_async_tool():
    """Test async tool execution."""
    result = await async_test_tool("test")
    assert result["status"] == "success"
    assert "Async: test" in result["content"][0]["text"]
```

### Mock Model Testing

```python
import pytest
from unittest.mock import Mock, patch
from strands import Agent

def test_agent_with_mock_model():
    """Test agent with mocked model."""
    mock_model = Mock()
    mock_model.invoke.return_value = {
        "role": "assistant",
        "content": [{"text": "Mocked response"}]
    }
    
    agent = Agent(model=mock_model)
    # Test agent behavior without real API calls
```

## Integration Testing

### Test with Real Models

```python
# tests_integ/test_openai_integration.py
import pytest
import os
from strands import Agent
from strands.models import OpenAIModel

@pytest.fixture
def openai_agent():
    """Create OpenAI agent for testing."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    
    model = OpenAIModel(
        model_id="gpt-4o-mini",
        client_args={"api_key": api_key}
    )
    return Agent(model=model)

def test_basic_conversation(openai_agent):
    """Test basic conversation with OpenAI."""
    response = openai_agent("What is 2+2?")
    assert response is not None
    assert "4" in str(response).lower()

def test_tool_usage(openai_agent):
    """Test tool usage with OpenAI."""
    from strands import tool
    
    @tool
    def add(a: int, b: int) -> dict:
        """Add two numbers."""
        return {"status": "success", "content": [{"text": str(a + b)}]}
    
    agent = Agent(
        model=openai_agent.model,
        tools=[add]
    )
    response = agent("Use the add tool to calculate 5 + 3")
    assert "8" in str(response)
```

### Test Conversation Flow

```python
def test_conversation_memory(openai_agent):
    """Test that agent remembers conversation."""
    openai_agent("My name is Alice")
    response = openai_agent("What is my name?")
    assert "alice" in str(response).lower()
```

## Testing Hooks

```python
import pytest
from strands import Agent
from strands.hooks import (
    HookProvider, HookRegistry,
    BeforeInvocationEvent, AfterInvocationEvent
)

class TestHooks(HookProvider):
    """Test hooks for verification."""
    
    def __init__(self):
        self.before_called = False
        self.after_called = False
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeInvocationEvent, self.on_before)
        registry.add_callback(AfterInvocationEvent, self.on_after)
    
    def on_before(self, event: BeforeInvocationEvent) -> None:
        self.before_called = True
    
    def on_after(self, event: AfterInvocationEvent) -> None:
        self.after_called = True

def test_hooks_execution():
    """Test that hooks are called."""
    test_hooks = TestHooks()
    agent = Agent(hooks=[test_hooks])
    
    # Mock invocation
    assert test_hooks.before_called is False
    assert test_hooks.after_called is False
    
    # After invocation, hooks should be called
    # (requires mock or real model)
```

## Testing Best Practices

### 1. Use Fixtures

```python
import pytest
from strands import Agent

@pytest.fixture
def basic_agent():
    """Basic agent fixture."""
    return Agent()

@pytest.fixture
def agent_with_tools():
    """Agent with tools fixture."""
    from strands_tools import calculator
    return Agent(tools=[calculator])

def test_with_fixture(basic_agent):
    """Test using fixture."""
    assert basic_agent is not None
```

### 2. Parametrize Tests

```python
import pytest
from strands import tool

@tool
def process(text: str) -> dict:
    """Process text."""
    return {"status": "success", "content": [{"text": text.upper()}]}

@pytest.mark.parametrize("input_text,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("test", "TEST"),
])
def test_process_parametrized(input_text, expected):
    """Test with multiple inputs."""
    result = process(input_text)
    assert expected in result["content"][0]["text"]
```

### 3. Test Error Handling

```python
import pytest
from strands import tool

@tool
def divide(a: int, b: int) -> dict:
    """Divide two numbers."""
    if b == 0:
        return {"status": "error", "content": [{"text": "Division by zero"}]}
    return {"status": "success", "content": [{"text": str(a / b)}]}

def test_divide_by_zero():
    """Test error handling."""
    result = divide(10, 0)
    assert result["status"] == "error"
    assert "Division by zero" in result["content"][0]["text"]
```

### 4. Test Async Code

```python
import pytest
import asyncio
from strands import Agent

@pytest.mark.asyncio
async def test_async_streaming():
    """Test async streaming."""
    agent = Agent()
    
    chunks = []
    async for event in agent.stream_async("Tell me a short story"):
        if "data" in event:
            chunks.append(event["data"])
    
    assert len(chunks) > 0
```

### 5. Clean Up Resources

```python
import pytest
from strands import Agent

@pytest.fixture
def agent():
    """Agent fixture with cleanup."""
    agent = Agent()
    yield agent
    # Cleanup
    agent.messages.clear()

def test_with_cleanup(agent):
    """Test with automatic cleanup."""
    agent("Hello")
    assert len(agent.messages) > 0
    # Cleanup happens automatically after test
```

## Code Quality

### Formatting

```bash
# Check formatting
hatch fmt --formatter

# Auto-fix formatting
hatch fmt
```

### Linting

```bash
# Run linter
hatch fmt --linter

# Type checking with mypy
mypy src/
```

### Pre-commit Hooks

```bash
# Run all hooks manually
pre-commit run --all-files

# Install hooks
pre-commit install
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        pip install hatch
        hatch env create
    
    - name: Run tests
      run: hatch test -c
    
    - name: Run linting
      run: hatch fmt --linter
```

## Test Coverage

### Generate Coverage Report

```bash
# Run tests with coverage
hatch test -c

# Generate HTML report
coverage html

# View report
open htmlcov/index.html
```

### Coverage Configuration

```toml
# pyproject.toml
[tool.coverage.run]
branch = true
source = ["src/strands"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

## Debugging Tests

### Run Single Test

```bash
# Run specific test
pytest tests/strands/agent/test_agent.py::test_agent_creation

# Run with verbose output
pytest -v tests/strands/agent/test_agent.py

# Run with print statements
pytest -s tests/strands/agent/test_agent.py
```

### Debug with pdb

```python
import pytest

def test_with_debugger():
    """Test with debugger."""
    agent = Agent()
    
    # Set breakpoint
    import pdb; pdb.set_trace()
    
    response = agent("Hello")
    assert response is not None
```

## Testing Checklist

- [ ] Unit tests for all core functionality
- [ ] Integration tests with real models
- [ ] Test error handling and edge cases
- [ ] Test async functionality
- [ ] Mock external dependencies
- [ ] Use fixtures for common setup
- [ ] Parametrize tests for multiple inputs
- [ ] Clean up resources after tests
- [ ] Maintain high test coverage (>80%)
- [ ] Run tests in CI/CD pipeline
- [ ] Document test requirements
- [ ] Test hooks and lifecycle events
