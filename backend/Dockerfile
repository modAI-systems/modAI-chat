#################
## Build stage ##
#################
FROM python:3.13-alpine AS build

# Install uv.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy required project files
COPY src/ pyproject.toml /app/

WORKDIR /app
RUN uv sync --no-dev


#################
## Final stage ##
#################
FROM python:3.13-alpine

# Copy the app from build stage
COPY --from=build /app /app

WORKDIR /app

EXPOSE 8080

CMD ["/app/.venv/bin/uvicorn", "modai.main:app", "--host", "0.0.0.0", "--port", "8080"]
