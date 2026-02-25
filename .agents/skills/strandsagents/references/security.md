# Security Best Practices

## API Key Management

### Environment Variables

**NEVER hardcode API keys in source code.** Always use environment variables:

```python
import os
from strands import Agent
from strands.models import OpenAIModel

# ✅ Good - Use environment variable
openai_model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": os.environ.get("OPENAI_API_KEY")}
)

# ❌ Bad - Hardcoded API key
openai_model = OpenAIModel(
    model_id="gpt-4o",
    client_args={"api_key": "sk-proj-abc123..."}  # NEVER DO THIS
)
```

### .env Files

Use `.env` files for local development:

```bash
# .env
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-abc123...
```

Load with python-dotenv:

```python
from dotenv import load_dotenv
import os

load_dotenv()

openai_key = os.environ.get("OPENAI_API_KEY")
```

**Important**: Add `.env` to `.gitignore`:

```gitignore
.env
.env.local
*.env
```

### AWS Secrets Manager

For production, use secure vaults:

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret("my-app/api-keys")
openai_key = secrets["OPENAI_API_KEY"]
```

## Input Validation

### Validate Tool Inputs

Always validate and sanitize inputs:

```python
from strands import tool

@tool
def execute_query(query: str) -> dict:
    """Execute a database query."""
    # Validate input
    if not query or len(query) > 1000:
        return {"status": "error", "content": [{"text": "Invalid query"}]}
    
    # Sanitize - prevent SQL injection
    if any(keyword in query.lower() for keyword in ["drop", "delete", "truncate"]):
        return {"status": "error", "content": [{"text": "Forbidden operation"}]}
    
    # Execute safely
    result = safe_execute(query)
    return {"status": "success", "content": [{"text": result}]}
```

### Type Checking

Use type hints and runtime validation:

```python
from strands import tool
from typing import Union

@tool
def process_data(data: str, max_length: int = 100) -> dict:
    """Process data with length limit."""
    if not isinstance(data, str):
        return {"status": "error", "content": [{"text": "Data must be string"}]}
    
    if not isinstance(max_length, int) or max_length <= 0:
        return {"status": "error", "content": [{"text": "Invalid max_length"}]}
    
    if len(data) > max_length:
        return {"status": "error", "content": [{"text": f"Data exceeds {max_length} chars"}]}
    
    return {"status": "success", "content": [{"text": f"Processed: {data}"}]}
```

## Guardrails

### AWS Bedrock Guardrails

Use Bedrock guardrails for content filtering:

```python
from strands import Agent
from strands.models import BedrockModel

bedrock_model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    guardrail_id="my-guardrail-id",
    guardrail_version="1"
)
agent = Agent(model=bedrock_model)
```

### Custom Content Filtering

Implement custom filters:

```python
from strands import Agent
from strands.hooks import HookProvider, HookRegistry, BeforeInvocationEvent

class ContentFilterHooks(HookProvider):
    """Filter sensitive content."""
    
    BLOCKED_PATTERNS = ["password", "api_key", "secret"]
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeInvocationEvent, self.filter_content)
    
    def filter_content(self, event: BeforeInvocationEvent) -> None:
        # Check user input for sensitive patterns
        user_input = str(event.invocation_state.get("input", "")).lower()
        for pattern in self.BLOCKED_PATTERNS:
            if pattern in user_input:
                raise ValueError(f"Blocked pattern detected: {pattern}")

agent = Agent(hooks=[ContentFilterHooks()])
```

## Rate Limiting

### Implement Rate Limits

Protect against abuse:

```python
from strands import Agent, tool
from strands.types.tools import ToolContext
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.calls = defaultdict(list)
    
    def check(self, user_id: str) -> bool:
        now = time.time()
        # Remove old calls
        self.calls[user_id] = [t for t in self.calls[user_id] if now - t < self.window_seconds]
        
        if len(self.calls[user_id]) >= self.max_calls:
            return False
        
        self.calls[user_id].append(now)
        return True

rate_limiter = RateLimiter(max_calls=10, window_seconds=60)

@tool(context=True)
def rate_limited_operation(data: str, tool_context: ToolContext) -> dict:
    """Operation with rate limiting."""
    user_id = tool_context.agent.state.get("user_id", "anonymous")
    
    if not rate_limiter.check(user_id):
        return {"status": "error", "content": [{"text": "Rate limit exceeded"}]}
    
    # Process operation
    return {"status": "success", "content": [{"text": f"Processed: {data}"}]}
```

## Secure Tool Execution

### Sandbox Tool Execution

Isolate tool execution:

```python
import subprocess
from strands import tool

@tool
def execute_code(code: str) -> dict:
    """Execute code in sandboxed environment."""
    # Validate code
    if not code or len(code) > 1000:
        return {"status": "error", "content": [{"text": "Invalid code"}]}
    
    # Block dangerous imports
    blocked = ["os", "sys", "subprocess", "eval", "exec"]
    if any(module in code for module in blocked):
        return {"status": "error", "content": [{"text": "Forbidden imports"}]}
    
    try:
        # Execute in restricted environment
        result = subprocess.run(
            ["python", "-c", code],
            capture_output=True,
            text=True,
            timeout=5,
            env={"PYTHONPATH": ""}  # Restricted environment
        )
        return {"status": "success", "content": [{"text": result.stdout}]}
    except subprocess.TimeoutExpired:
        return {"status": "error", "content": [{"text": "Execution timeout"}]}
    except Exception as e:
        return {"status": "error", "content": [{"text": f"Error: {str(e)}"}]}
```

## Logging and Monitoring

### Secure Logging

Never log sensitive information:

```python
import logging

logger = logging.getLogger(__name__)

# ✅ Good - No sensitive data
logger.info("user_id=<%s> | user authenticated", user_id)

# ❌ Bad - Logs API key
logger.info("api_key=<%s> | authentication successful", api_key)  # NEVER DO THIS

# ✅ Good - Mask sensitive data
logger.info("api_key=<%s> | authentication successful", api_key[:8] + "***")
```

### Audit Trail

Track agent operations:

```python
from strands import Agent
from strands.hooks import HookProvider, HookRegistry, AfterToolCallEvent
import logging

class AuditHooks(HookProvider):
    """Audit trail for tool calls."""
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AfterToolCallEvent, self.log_tool_call)
    
    def log_tool_call(self, event: AfterToolCallEvent) -> None:
        logger.info(
            "tool=<%s>, user_id=<%s>, status=<%s> | tool executed",
            event.tool.tool_name,
            event.tool_context.agent.state.get("user_id", "anonymous"),
            "success" if event.result else "error"
        )

agent = Agent(hooks=[AuditHooks()])
```

## Vulnerability Reporting

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Report via [AWS Security Vulnerability Reporting](http://aws.amazon.com/security/vulnerability-reporting/)
3. Provide detailed description and reproduction steps

## Security Checklist

- [ ] API keys stored in environment variables or secure vaults
- [ ] `.env` files in `.gitignore`
- [ ] Input validation on all tools
- [ ] Rate limiting implemented
- [ ] Content filtering for sensitive data
- [ ] Secure logging (no API keys/secrets)
- [ ] Audit trail for operations
- [ ] Sandboxed tool execution for code
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies regularly updated
