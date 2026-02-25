# Model Context Protocol (MCP) Integration

## Overview

MCP enables integration with thousands of pre-built tools from MCP servers. Strands provides seamless integration via `MCPClient`.

## Basic Usage

### Connect to MCP Server

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# Connect to AWS documentation server
aws_docs_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="uvx",
        args=["awslabs.aws-documentation-mcp-server@latest"]
    ))
)

with aws_docs_client:
    agent = Agent(tools=aws_docs_client.list_tools_sync())
    response = agent("Tell me about Amazon Bedrock and how to use it with Python")
```

## MCPClient Configuration

### Startup Timeout

```python
aws_docs_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="uvx",
        args=["awslabs.aws-documentation-mcp-server@latest"]
    )),
    startup_timeout=30  # Timeout for server initialization
)
```

### Tool Filtering

```python
# Only include specific tools
filesystem_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@anthropic/mcp-server-filesystem", "/tmp"]
    )),
    tool_filters={
        "allowed": ["read_file", "list_directory"],  # Only these tools
        "rejected": ["delete_file"]  # Exclude these
    },
    prefix="fs"  # Prefix tool names: fs_read_file, fs_list_directory
)
```

### Tool Prefix

```python
# Add prefix to avoid name conflicts
client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@anthropic/mcp-server-filesystem", "/tmp"]
    )),
    prefix="fs"  # Tools become: fs_read_file, fs_list_directory, etc.
)
```

## Multiple MCP Servers

Combine tools from multiple servers:

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# AWS documentation server
aws_docs_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="uvx",
        args=["awslabs.aws-documentation-mcp-server@latest"]
    ))
)

# Filesystem server
filesystem_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@anthropic/mcp-server-filesystem", "/tmp"]
    )),
    prefix="fs"
)

# Use both servers
with aws_docs_client, filesystem_client:
    all_tools = aws_docs_client.list_tools_sync() + filesystem_client.list_tools_sync()
    agent = Agent(tools=all_tools)
    response = agent("Read the README file and summarize it")
```

## MCP Prompts

Access pre-defined prompts from MCP servers:

```python
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="uvx",
        args=["awslabs.aws-documentation-mcp-server@latest"]
    ))
)

with client:
    # List available prompts
    prompts = client.list_prompts_sync()
    print(f"Available prompts: {[p.name for p in prompts]}")
    
    # Get a specific prompt
    prompt_result = client.get_prompt_sync("my-prompt", {"arg1": "value"})
    print(f"Prompt: {prompt_result}")
```

## MCP Resources

Access resources from MCP servers:

```python
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@anthropic/mcp-server-filesystem", "/tmp"]
    ))
)

with client:
    # List available resources
    resources = client.list_resources_sync()
    print(f"Available resources: {[r.uri for r in resources]}")
    
    # Read a specific resource
    content = client.read_resource_sync("file:///path/to/resource")
    print(f"Resource content: {content}")
```

## Popular MCP Servers

### AWS Documentation

```python
aws_docs_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="uvx",
        args=["awslabs.aws-documentation-mcp-server@latest"]
    ))
)
```

### Filesystem

```python
filesystem_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@anthropic/mcp-server-filesystem", "/path/to/directory"]
    ))
)
```

### GitHub

```python
github_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@modelcontextprotocol/server-github"]
    ))
)
```

### Brave Search

```python
brave_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["@modelcontextprotocol/server-brave-search"]
    ))
)
```

## Error Handling

### Connection Errors

```python
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

try:
    client = MCPClient(
        lambda: stdio_client(StdioServerParameters(
            command="uvx",
            args=["awslabs.aws-documentation-mcp-server@latest"]
        )),
        startup_timeout=30
    )
    
    with client:
        tools = client.list_tools_sync()
        print(f"Connected: {len(tools)} tools available")
except TimeoutError:
    print("MCP server startup timeout")
except Exception as e:
    print(f"Connection error: {e}")
```

### Tool Execution Errors

```python
from strands import Agent
from strands.tools.mcp import MCPClient

client = MCPClient(...)

with client:
    agent = Agent(tools=client.list_tools_sync())
    
    try:
        response = agent("Execute risky operation")
    except RuntimeError as e:
        if "Connection to the MCP server was closed" in str(e):
            print("MCP server connection lost")
        else:
            raise
```

## Best Practices

### 1. Use Context Managers

Always use `with` statement for automatic cleanup:

```python
# ✅ Good - Automatic cleanup
with mcp_client:
    agent = Agent(tools=mcp_client.list_tools_sync())
    response = agent("Use MCP tools")

# ❌ Bad - Manual cleanup required
mcp_client = MCPClient(...)
agent = Agent(tools=mcp_client.list_tools_sync())
# Cleanup not guaranteed
```

### 2. Filter Tools

Only expose necessary tools to reduce context:

```python
# ✅ Good - Only necessary tools
client = MCPClient(
    ...,
    tool_filters={"allowed": ["read_file", "list_directory"]}
)

# ❌ Bad - All tools exposed
client = MCPClient(...)  # Exposes all tools including dangerous ones
```

### 3. Use Prefixes

Avoid name conflicts with prefixes:

```python
# ✅ Good - Prefixed tools
fs_client = MCPClient(..., prefix="fs")
db_client = MCPClient(..., prefix="db")

# Both have "list" tool, but become: fs_list, db_list
```

### 4. Set Timeouts

Configure appropriate timeouts:

```python
# ✅ Good - Reasonable timeout
client = MCPClient(..., startup_timeout=30)

# ❌ Bad - No timeout (may hang)
client = MCPClient(...)
```

### 5. Handle Errors

Implement error handling for robustness:

```python
try:
    with mcp_client:
        agent = Agent(tools=mcp_client.list_tools_sync())
        response = agent("Task")
except TimeoutError:
    print("MCP server timeout")
except RuntimeError as e:
    print(f"MCP error: {e}")
```

## Advanced Usage

### Custom MCP Server

Create your own MCP server:

```python
# server.py
from mcp.server import Server
from mcp.types import Tool

server = Server("my-custom-server")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="custom_tool",
            description="A custom tool",
            inputSchema={
                "type": "object",
                "properties": {
                    "param": {"type": "string"}
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "custom_tool":
        return {"result": f"Processed: {arguments['param']}"}

if __name__ == "__main__":
    server.run()
```

Connect to custom server:

```python
custom_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="python",
        args=["server.py"]
    ))
)
```

### Async MCP Operations

```python
import asyncio
from strands.tools.mcp import MCPClient

async def async_mcp():
    client = MCPClient(...)
    
    async with client:
        tools = await client.list_tools()
        prompts = await client.list_prompts()
        resources = await client.list_resources()
        
        print(f"Tools: {len(tools)}")
        print(f"Prompts: {len(prompts)}")
        print(f"Resources: {len(resources)}")

asyncio.run(async_mcp())
```

## Troubleshooting

### Server Not Starting

```bash
# Check if command is available
which uvx
which npx

# Test server manually
uvx awslabs.aws-documentation-mcp-server@latest

# Check logs
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
```

### Connection Hanging

```python
# Increase timeout
client = MCPClient(..., startup_timeout=60)

# Check for error messages
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Tool Not Found

```python
# List all available tools
with client:
    tools = client.list_tools_sync()
    print(f"Available tools: {[t.tool_name for t in tools]}")
```

## MCP Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Servers Registry](https://github.com/modelcontextprotocol/servers)
- [Creating MCP Servers](https://modelcontextprotocol.io/docs/creating-servers)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
