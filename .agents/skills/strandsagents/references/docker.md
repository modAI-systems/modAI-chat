# Docker Deployment

## Basic Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run agent
CMD ["python", "agent.py"]
```

## Multi-Stage Build

Optimize image size:

```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Update PATH
ENV PATH=/root/.local/bin:$PATH

# Run agent
CMD ["python", "agent.py"]
```

## Production Dockerfile

With security and optimization:

```dockerfile
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 agent && \
    mkdir -p /app && \
    chown -R agent:agent /app

WORKDIR /app

# Install dependencies as root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache

# Copy application
COPY --chown=agent:agent . .

# Switch to non-root user
USER agent

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# Run agent
CMD ["python", "agent.py"]
```

## Docker Compose

### Basic Setup

```yaml
version: '3.8'

services:
  agent:
    build: .
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### With Environment File

```yaml
version: '3.8'

services:
  agent:
    build: .
    env_file:
      - .env
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Multi-Agent Setup

```yaml
version: '3.8'

services:
  coordinator:
    build: .
    environment:
      - AGENT_ROLE=coordinator
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - worker1
      - worker2
    networks:
      - agent-network

  worker1:
    build: .
    environment:
      - AGENT_ROLE=worker
      - WORKER_ID=1
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    networks:
      - agent-network

  worker2:
    build: .
    environment:
      - AGENT_ROLE=worker
      - WORKER_ID=2
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
```

## Example Application

### agent.py

```python
import os
from strands import Agent
from strands.models import OpenAIModel

def main():
    # Get configuration from environment
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    # Create agent
    model = OpenAIModel(
        model_id="gpt-4o",
        client_args={"api_key": openai_key}
    )
    agent = Agent(
        model=model,
        system_prompt="You are a helpful assistant."
    )
    
    # Run agent loop
    print("Agent started. Type 'exit' to quit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            break
        
        response = agent(user_input)
        print(f"Agent: {response}")

if __name__ == "__main__":
    main()
```

### requirements.txt

```
strands-agents==0.1.0
strands-agents-tools==0.1.0
python-dotenv==1.0.0
```

## Building and Running

### Build Image

```bash
docker build -t my-agent .
```

### Run Container

```bash
docker run -e OPENAI_API_KEY=$OPENAI_API_KEY my-agent
```

### With Docker Compose

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Variables

### .env File

```bash
# API Keys
OPENAI_API_KEY=sk-proj-abc123...
ANTHROPIC_API_KEY=sk-ant-abc123...

# Agent Configuration
AGENT_NAME=MyAgent
AGENT_ROLE=coordinator
LOG_LEVEL=INFO

# Model Configuration
MODEL_ID=gpt-4o
TEMPERATURE=0.7
MAX_TOKENS=2048

# OpenTelemetry
OTEL_SERVICE_NAME=my-agent-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Secrets Management

### Docker Secrets

```yaml
version: '3.8'

services:
  agent:
    build: .
    secrets:
      - openai_api_key
    environment:
      - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key

secrets:
  openai_api_key:
    file: ./secrets/openai_api_key.txt
```

Read secret in Python:

```python
import os

def get_secret(secret_name):
    secret_file = os.environ.get(f"{secret_name.upper()}_FILE")
    if secret_file:
        with open(secret_file) as f:
            return f.read().strip()
    return os.environ.get(secret_name.upper())

openai_key = get_secret("openai_api_key")
```

## Monitoring

### Health Check

```python
# health.py
from strands import Agent
from strands.models import OpenAIModel
import os
import sys

def health_check():
    try:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            return False
        
        model = OpenAIModel(model_id="gpt-4o", client_args={"api_key": openai_key})
        agent = Agent(model=model)
        
        # Simple test
        response = agent("ping")
        return bool(response)
    except Exception:
        return False

if __name__ == "__main__":
    sys.exit(0 if health_check() else 1)
```

### Dockerfile with Health Check

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python health.py

CMD ["python", "agent.py"]
```

## Logging

### Configure Logging

```python
import logging
import sys

# Configure logging for container
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Log to stdout for Docker
    ]
)

logger = logging.getLogger(__name__)
```

### Docker Compose Logging

```yaml
version: '3.8'

services:
  agent:
    build: .
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "agent,production"
```

## Best Practices

1. **Use Multi-Stage Builds**: Reduce image size
2. **Non-Root User**: Run as non-root for security
3. **Health Checks**: Implement health check endpoints
4. **Environment Variables**: Use for configuration
5. **Secrets Management**: Never hardcode secrets
6. **Logging**: Log to stdout/stderr for Docker
7. **Resource Limits**: Set memory and CPU limits
8. **Restart Policy**: Use `unless-stopped` or `on-failure`
9. **Volume Mounts**: Persist data outside container
10. **Network Isolation**: Use Docker networks

## Resource Limits

```yaml
version: '3.8'

services:
  agent:
    build: .
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    restart: unless-stopped
```

## Production Checklist

- [ ] Multi-stage build for smaller images
- [ ] Non-root user configured
- [ ] Health checks implemented
- [ ] Secrets via environment or Docker secrets
- [ ] Logging to stdout/stderr
- [ ] Resource limits set
- [ ] Restart policy configured
- [ ] Volumes for persistent data
- [ ] Network isolation configured
- [ ] Security scanning (e.g., Trivy)
- [ ] Image tagged with version
- [ ] Documentation updated
