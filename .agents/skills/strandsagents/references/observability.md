# Observability and Telemetry

## OpenTelemetry Integration

### Basic Setup

```python
from strands import Agent
from strands.telemetry import StrandsTelemetry

# Quick setup with console and OTLP exporters
StrandsTelemetry().setup_console_exporter().setup_otlp_exporter()

# Create agent
agent = Agent()
response = agent("Hello, world!")
```

### Environment Variables

Configure via environment:

```bash
# Service identification
export OTEL_SERVICE_NAME=my-agent-service

# OTLP endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Sampling
export OTEL_TRACES_SAMPLER=always_on
```

### Custom Trace Attributes

```python
from strands import Agent

agent = Agent(
    trace_attributes={
        "environment": "production",
        "version": "1.0.0",
        "user.id": "user-123",
        "team": "platform"
    }
)
response = agent("Process this data")
```

## Metrics

### Access Agent Metrics

```python
from strands import Agent

agent = Agent()
result = agent("Process this data")

# Access metrics
metrics = result.metrics
print(f"Input tokens: {metrics.input_tokens}")
print(f"Output tokens: {metrics.output_tokens}")
print(f"Total latency: {metrics.total_time}ms")
print(f"Model calls: {metrics.model_calls}")
```

### Setup Metrics Exporter

```python
from strands.telemetry import StrandsTelemetry

telemetry = StrandsTelemetry()
telemetry.setup_console_exporter()
telemetry.setup_otlp_exporter()
telemetry.setup_meter(enable_console_exporter=True, enable_otlp_exporter=True)
```

## Custom Tracing

### Custom Spans

```python
from strands import Agent
from strands.telemetry import get_tracer

tracer = get_tracer()

with tracer.tracer.start_as_current_span("custom_operation") as span:
    span.set_attribute("custom.key", "value")
    span.set_attribute("operation.type", "data_processing")
    
    agent = Agent()
    result = agent("Perform traced operation")
    
    span.set_attribute("result.tokens", result.metrics.output_tokens)
```

### Nested Spans

```python
from strands.telemetry import get_tracer

tracer = get_tracer()

with tracer.tracer.start_as_current_span("workflow") as workflow_span:
    workflow_span.set_attribute("workflow.id", "wf-123")
    
    with tracer.tracer.start_as_current_span("step_1") as step1_span:
        step1_span.set_attribute("step.name", "data_collection")
        # Step 1 logic
    
    with tracer.tracer.start_as_current_span("step_2") as step2_span:
        step2_span.set_attribute("step.name", "data_processing")
        # Step 2 logic
```

## Structured Logging

### Logging Format

Use structured logging with field-value pairs:

```python
import logging

logger = logging.getLogger(__name__)

# ✅ Good - Structured format
logger.debug("field1=<%s>, field2=<%s> | human readable message", field1, field2)
logger.info("request_id=<%s>, duration_ms=<%d> | request completed", request_id, duration)
logger.warning("attempt=<%d>, max_attempts=<%d> | retry limit approaching", attempt, max_attempts)

# ❌ Bad - Unstructured
logger.info(f"Request {request_id} completed in {duration}ms")
```

### Logging Best Practices

```python
import logging

logger = logging.getLogger(__name__)

# Use %s for interpolation (performance)
logger.debug("user_id=<%s>, action=<%s> | user performed action", user_id, action)

# Separate fields and message with |
logger.info("request_id=<%s>, duration_ms=<%d> | request completed", request_id, duration)

# Lowercase messages, no punctuation
logger.warning("attempt=<%d>, max_attempts=<%d> | retry limit approaching", attempt, max_attempts)

# Multiple statements with |
logger.info("user_id=<%s> | processing request | starting validation", user_id)
```

## Hooks for Observability

### Logging Hooks

```python
from strands import Agent
from strands.hooks import (
    HookProvider, HookRegistry,
    AgentInitializedEvent, BeforeInvocationEvent, AfterInvocationEvent,
    BeforeToolCallEvent, AfterToolCallEvent
)
import time
import logging

logger = logging.getLogger(__name__)

class LoggingHooks(HookProvider):
    """Custom hooks for logging and monitoring."""
    
    def __init__(self):
        self.call_count = 0
        self.total_duration = 0
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AgentInitializedEvent, self.on_init)
        registry.add_callback(BeforeInvocationEvent, self.on_before_invoke)
        registry.add_callback(AfterInvocationEvent, self.on_after_invoke)
        registry.add_callback(BeforeToolCallEvent, self.on_before_tool)
        registry.add_callback(AfterToolCallEvent, self.on_after_tool)
    
    def on_init(self, event: AgentInitializedEvent) -> None:
        logger.info("agent_name=<%s> | agent initialized", event.agent.name)
    
    def on_before_invoke(self, event: BeforeInvocationEvent) -> None:
        self.call_count += 1
        self.start_time = time.time()
        logger.info("invocation=<%d> | starting invocation", self.call_count)
    
    def on_after_invoke(self, event: AfterInvocationEvent) -> None:
        duration = time.time() - self.start_time
        self.total_duration += duration
        logger.info(
            "invocation=<%d>, duration_ms=<%d>, stop_reason=<%s> | invocation completed",
            self.call_count, int(duration * 1000), event.result.stop_reason if event.result else "unknown"
        )
    
    def on_before_tool(self, event: BeforeToolCallEvent) -> None:
        logger.info("tool=<%s> | calling tool", event.tool.tool_name)
    
    def on_after_tool(self, event: AfterToolCallEvent) -> None:
        logger.info("tool=<%s> | tool completed", event.tool.tool_name)

# Use hooks
logging_hooks = LoggingHooks()
agent = Agent(hooks=[logging_hooks], name="MyAssistant")
response = agent("Hello!")

print(f"Total calls: {logging_hooks.call_count}")
print(f"Total duration: {logging_hooks.total_duration:.2f}s")
```

### Metrics Hooks

```python
from strands.hooks import HookProvider, HookRegistry, AfterInvocationEvent
from collections import defaultdict

class MetricsHooks(HookProvider):
    """Track custom metrics."""
    
    def __init__(self):
        self.metrics = defaultdict(int)
        self.token_usage = {"input": 0, "output": 0}
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AfterInvocationEvent, self.track_metrics)
    
    def track_metrics(self, event: AfterInvocationEvent) -> None:
        if event.result:
            self.metrics["invocations"] += 1
            self.token_usage["input"] += event.result.metrics.input_tokens
            self.token_usage["output"] += event.result.metrics.output_tokens
    
    def get_summary(self) -> dict:
        return {
            "total_invocations": self.metrics["invocations"],
            "total_input_tokens": self.token_usage["input"],
            "total_output_tokens": self.token_usage["output"],
            "total_tokens": self.token_usage["input"] + self.token_usage["output"]
        }

metrics_hooks = MetricsHooks()
agent = Agent(hooks=[metrics_hooks])

# Use agent
agent("Task 1")
agent("Task 2")

# Get metrics
summary = metrics_hooks.get_summary()
print(f"Summary: {summary}")
```

## Integration with Monitoring Systems

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, start_http_server
from strands import Agent
from strands.hooks import HookProvider, HookRegistry, AfterInvocationEvent

# Define metrics
invocations_total = Counter('agent_invocations_total', 'Total agent invocations')
invocation_duration = Histogram('agent_invocation_duration_seconds', 'Invocation duration')
tokens_total = Counter('agent_tokens_total', 'Total tokens used', ['type'])

class PrometheusHooks(HookProvider):
    """Export metrics to Prometheus."""
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AfterInvocationEvent, self.export_metrics)
    
    def export_metrics(self, event: AfterInvocationEvent) -> None:
        if event.result:
            invocations_total.inc()
            invocation_duration.observe(event.result.metrics.total_time / 1000)
            tokens_total.labels(type='input').inc(event.result.metrics.input_tokens)
            tokens_total.labels(type='output').inc(event.result.metrics.output_tokens)

# Start Prometheus server
start_http_server(8000)

# Use agent with Prometheus hooks
agent = Agent(hooks=[PrometheusHooks()])
```

### CloudWatch Metrics

```python
import boto3
from strands import Agent
from strands.hooks import HookProvider, HookRegistry, AfterInvocationEvent

cloudwatch = boto3.client('cloudwatch')

class CloudWatchHooks(HookProvider):
    """Export metrics to CloudWatch."""
    
    def __init__(self, namespace: str):
        self.namespace = namespace
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(AfterInvocationEvent, self.export_metrics)
    
    def export_metrics(self, event: AfterInvocationEvent) -> None:
        if event.result:
            cloudwatch.put_metric_data(
                Namespace=self.namespace,
                MetricData=[
                    {
                        'MetricName': 'Invocations',
                        'Value': 1,
                        'Unit': 'Count'
                    },
                    {
                        'MetricName': 'InputTokens',
                        'Value': event.result.metrics.input_tokens,
                        'Unit': 'Count'
                    },
                    {
                        'MetricName': 'OutputTokens',
                        'Value': event.result.metrics.output_tokens,
                        'Unit': 'Count'
                    },
                    {
                        'MetricName': 'Duration',
                        'Value': event.result.metrics.total_time,
                        'Unit': 'Milliseconds'
                    }
                ]
            )

agent = Agent(hooks=[CloudWatchHooks(namespace='MyAgent')])
```

## Debugging

### Enable Debug Logging

```python
import logging

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from strands import Agent

agent = Agent()
response = agent("Debug this")
```

### Inspect Messages

```python
from strands import Agent

agent = Agent()
agent("Hello, my name is Alice")
agent("I like pizza")

# Inspect conversation history
print(f"Message count: {len(agent.messages)}")
for msg in agent.messages:
    print(f"{msg['role']}: {msg['content']}")
```

### Trace Tool Calls

```python
from strands import Agent, tool
from strands.hooks import HookProvider, HookRegistry, BeforeToolCallEvent, AfterToolCallEvent
import logging

logger = logging.getLogger(__name__)

class ToolTraceHooks(HookProvider):
    """Trace all tool calls."""
    
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeToolCallEvent, self.before_tool)
        registry.add_callback(AfterToolCallEvent, self.after_tool)
    
    def before_tool(self, event: BeforeToolCallEvent) -> None:
        logger.debug(
            "tool=<%s>, args=<%s> | calling tool",
            event.tool.tool_name,
            event.tool_input
        )
    
    def after_tool(self, event: AfterToolCallEvent) -> None:
        logger.debug(
            "tool=<%s>, result=<%s> | tool completed",
            event.tool.tool_name,
            str(event.result)[:100]  # Truncate for logging
        )

agent = Agent(hooks=[ToolTraceHooks()])
```

## Best Practices

1. **Use Structured Logging**: Field-value pairs for easy parsing
2. **Set Trace Attributes**: Add context to traces (user_id, version, etc.)
3. **Monitor Token Usage**: Track costs via metrics
4. **Implement Health Checks**: Verify agent availability
5. **Use Hooks for Observability**: Centralize monitoring logic
6. **Export to Monitoring Systems**: Integrate with Prometheus, CloudWatch, etc.
7. **Debug with Logging**: Enable DEBUG level for troubleshooting
8. **Track Performance**: Monitor latency and throughput
9. **Alert on Anomalies**: Set up alerts for errors and performance issues
10. **Retain Traces**: Keep traces for debugging and analysis
