# modAI REST Backend

Core technologies:

* FastAPI
* UV for dependency management


## Setup

To set up the development environment:

```bash
make dev
```

To run the application:

```bash
# Using Makefile (recommended)
make serve  # Run with uvicorn development server
```

## Architecture


## Tests

To execute all tests, keys to the following external systems are needed:
* OpenAI API (API KEY)

If one or more of those keys are not provided, the corresponding tests will be skipped.

Run tests with:
```bash
# Using Makefile (recommended)
make test
```

## Available Commands

See all available commands:
```bash
make help
```
