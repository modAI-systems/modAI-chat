# Multi-Agent Systems

## Agent as Tool

Use one agent as a tool for another:

```python
from strands import Agent, tool
from strands.models import OpenAIModel

# Create specialist agent
research_agent = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a research specialist. Provide detailed, factual information."
)

# Wrap agent as tool
@tool
def research(query: str) -> dict:
    """Research a topic using the research agent.
    
    Args:
        query: The research question or topic.
    """
    result = research_agent(query)
    return {"status": "success", "content": [{"text": str(result)}]}

# Create coordinator agent
coordinator = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    tools=[research],
    system_prompt="You are a coordinator. Delegate research tasks to the research tool."
)

# Use multi-agent system
response = coordinator("Research the history of AI and summarize it")
```

## Multi-Agent Orchestration

### Sequential Workflow

```python
from strands import Agent
from strands.models import OpenAIModel

# Create specialized agents
planner = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a planning specialist. Break down tasks into steps."
)

executor = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are an execution specialist. Implement detailed plans."
)

reviewer = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a review specialist. Critique and improve outputs."
)

# Sequential workflow
def sequential_workflow(task: str) -> str:
    # Step 1: Plan
    plan = planner(f"Create a plan for: {task}")
    print(f"Plan: {plan}")
    
    # Step 2: Execute
    execution = executor(f"Execute this plan: {plan}")
    print(f"Execution: {execution}")
    
    # Step 3: Review
    review = reviewer(f"Review this execution: {execution}")
    print(f"Review: {review}")
    
    return str(review)

result = sequential_workflow("Build a todo app")
```

### Parallel Workflow

```python
from strands import Agent
from strands.models import OpenAIModel
import asyncio

# Create specialized agents
code_agent = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a coding specialist."
)

docs_agent = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a documentation specialist."
)

test_agent = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    system_prompt="You are a testing specialist."
)

# Parallel workflow
async def parallel_workflow(task: str) -> dict:
    # Run agents in parallel
    code_task = asyncio.create_task(asyncio.to_thread(code_agent, f"Write code for: {task}"))
    docs_task = asyncio.create_task(asyncio.to_thread(docs_agent, f"Write docs for: {task}"))
    test_task = asyncio.create_task(asyncio.to_thread(test_agent, f"Write tests for: {task}"))
    
    # Wait for all to complete
    code, docs, tests = await asyncio.gather(code_task, docs_task, test_task)
    
    return {
        "code": str(code),
        "docs": str(docs),
        "tests": str(tests)
    }

result = asyncio.run(parallel_workflow("Build a calculator"))
```

## Swarm Pattern

Multiple agents collaborate:

```python
from strands import Agent, tool
from strands.models import OpenAIModel
from typing import List

class AgentSwarm:
    def __init__(self, agents: List[Agent]):
        self.agents = agents
    
    def collaborate(self, task: str) -> str:
        """All agents contribute to solving the task."""
        results = []
        
        for i, agent in enumerate(self.agents):
            # Each agent sees previous results
            context = "\n".join([f"Agent {j}: {r}" for j, r in enumerate(results)])
            prompt = f"Task: {task}\n\nPrevious contributions:\n{context}\n\nYour contribution:"
            
            result = agent(prompt)
            results.append(str(result))
        
        return "\n\n".join([f"Agent {i}: {r}" for i, r in enumerate(results)])

# Create swarm
swarm = AgentSwarm([
    Agent(model=OpenAIModel(model_id="gpt-4o"), system_prompt="You focus on architecture."),
    Agent(model=OpenAIModel(model_id="gpt-4o"), system_prompt="You focus on implementation."),
    Agent(model=OpenAIModel(model_id="gpt-4o"), system_prompt="You focus on optimization."),
])

result = swarm.collaborate("Design a scalable web service")
```

## Hierarchical Agents

Manager-worker pattern:

```python
from strands import Agent, tool
from strands.models import OpenAIModel

# Create worker agents
workers = {
    "data": Agent(
        model=OpenAIModel(model_id="gpt-4o"),
        system_prompt="You are a data processing specialist."
    ),
    "analysis": Agent(
        model=OpenAIModel(model_id="gpt-4o"),
        system_prompt="You are a data analysis specialist."
    ),
    "visualization": Agent(
        model=OpenAIModel(model_id="gpt-4o"),
        system_prompt="You are a data visualization specialist."
    )
}

# Create tools for manager to delegate
@tool
def delegate_to_data(task: str) -> dict:
    """Delegate data processing tasks."""
    result = workers["data"](task)
    return {"status": "success", "content": [{"text": str(result)}]}

@tool
def delegate_to_analysis(task: str) -> dict:
    """Delegate data analysis tasks."""
    result = workers["analysis"](task)
    return {"status": "success", "content": [{"text": str(result)}]}

@tool
def delegate_to_visualization(task: str) -> dict:
    """Delegate data visualization tasks."""
    result = workers["visualization"](task)
    return {"status": "success", "content": [{"text": str(result)}]}

# Create manager agent
manager = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    tools=[delegate_to_data, delegate_to_analysis, delegate_to_visualization],
    system_prompt="""You are a manager. Delegate tasks to specialists:
    - delegate_to_data: For data processing
    - delegate_to_analysis: For data analysis
    - delegate_to_visualization: For creating visualizations
    """
)

# Manager delegates automatically
response = manager("Analyze sales data and create a chart")
```

## State Sharing

Share state between agents:

```python
from strands import Agent
from strands.models import OpenAIModel

# Shared state
shared_state = {
    "context": [],
    "decisions": []
}

# Agent 1: Gather information
agent1 = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    state=shared_state,
    system_prompt="You gather information. Save findings to state['context']."
)

# Agent 2: Make decisions
agent2 = Agent(
    model=OpenAIModel(model_id="gpt-4o"),
    state=shared_state,
    system_prompt="You make decisions based on state['context']. Save to state['decisions']."
)

# Workflow with shared state
result1 = agent1("Research market trends")
shared_state["context"].append(str(result1))

result2 = agent2("Based on the research, what should we do?")
shared_state["decisions"].append(str(result2))

print(f"Context: {shared_state['context']}")
print(f"Decisions: {shared_state['decisions']}")
```

## Communication Patterns

### Message Passing

```python
from strands import Agent
from strands.models import OpenAIModel
from queue import Queue

class MessageBus:
    def __init__(self):
        self.queues = {}
    
    def create_queue(self, agent_id: str):
        self.queues[agent_id] = Queue()
    
    def send(self, to_agent: str, message: str):
        if to_agent in self.queues:
            self.queues[to_agent].put(message)
    
    def receive(self, agent_id: str) -> str:
        if agent_id in self.queues and not self.queues[agent_id].empty():
            return self.queues[agent_id].get()
        return None

# Create message bus
bus = MessageBus()
bus.create_queue("agent1")
bus.create_queue("agent2")

# Agents communicate via bus
agent1 = Agent(model=OpenAIModel(model_id="gpt-4o"))
agent2 = Agent(model=OpenAIModel(model_id="gpt-4o"))

# Agent 1 sends message
result1 = agent1("Analyze this data: [1,2,3,4,5]")
bus.send("agent2", str(result1))

# Agent 2 receives and responds
message = bus.receive("agent2")
result2 = agent2(f"Based on this analysis: {message}, what's the next step?")
```

## Best Practices

### 1. Clear Responsibilities

Give each agent a specific role:

```python
# ✅ Good - Clear specialization
researcher = Agent(system_prompt="You are a research specialist. Only provide factual information.")
writer = Agent(system_prompt="You are a writing specialist. Only create content.")

# ❌ Bad - Vague role
agent = Agent(system_prompt="You are a helpful assistant.")
```

### 2. Avoid Circular Dependencies

```python
# ❌ Bad - Circular delegation
@tool
def delegate_to_b(task: str) -> dict:
    return {"status": "success", "content": [{"text": str(agent_b(task))}]}

@tool
def delegate_to_a(task: str) -> dict:
    return {"status": "success", "content": [{"text": str(agent_a(task))}]}

agent_a = Agent(tools=[delegate_to_b])
agent_b = Agent(tools=[delegate_to_a])  # Circular!

# ✅ Good - Hierarchical structure
manager = Agent(tools=[delegate_to_worker1, delegate_to_worker2])
worker1 = Agent()
worker2 = Agent()
```

### 3. Limit Delegation Depth

Prevent infinite loops:

```python
class DelegationTracker:
    def __init__(self, max_depth: int = 3):
        self.depth = 0
        self.max_depth = max_depth
    
    def can_delegate(self) -> bool:
        return self.depth < self.max_depth
    
    def enter(self):
        self.depth += 1
    
    def exit(self):
        self.depth -= 1

tracker = DelegationTracker(max_depth=3)

@tool
def safe_delegate(task: str) -> dict:
    """Delegate with depth limit."""
    if not tracker.can_delegate():
        return {"status": "error", "content": [{"text": "Max delegation depth reached"}]}
    
    tracker.enter()
    try:
        result = worker_agent(task)
        return {"status": "success", "content": [{"text": str(result)}]}
    finally:
        tracker.exit()
```

### 4. Error Handling

Handle agent failures gracefully:

```python
def robust_delegation(agents: List[Agent], task: str) -> str:
    """Try multiple agents until one succeeds."""
    for agent in agents:
        try:
            result = agent(task)
            return str(result)
        except Exception as e:
            print(f"Agent failed: {e}")
            continue
    
    raise RuntimeError("All agents failed")
```

### 5. Monitor Performance

Track agent metrics:

```python
from strands import Agent
from strands.models import OpenAIModel

agent = Agent(model=OpenAIModel(model_id="gpt-4o"))
result = agent("Process this task")

# Access metrics
print(f"Input tokens: {result.metrics.input_tokens}")
print(f"Output tokens: {result.metrics.output_tokens}")
print(f"Total time: {result.metrics.total_time}ms")
```
