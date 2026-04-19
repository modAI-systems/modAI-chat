# External Module Development & Deployment

This guide walks you through developing and deploying your own external modules for the modAI backend.

## External Module Development

### Overview

External modules extend the modAI backend with new module implementations. They live in their own Git repositories and are cloned into `src/modai/modules/` under the `external-` prefix during development. All `src/modai/modules/external-*/` directories are git-ignored, so they never pollute the main repository.

### Step 1: Create Your Module Repository

Create a new Git repository for your module. The repository root should contain the module files directly.

A minimal module looks like this:

```
my-awesome-module/
├── __init__.py
├── module.py              # your ModaiModule implementation
└── requirements.txt       # extra PyPI dependencies (if any)
```

**`__init__.py`** — leave empty.

**`module.py`** — implement your module:

```python
from typing import Any
from fastapi import APIRouter
from modai.module import ModaiModule, ModuleDependencies


class AwesomeModule(ModaiModule):
    """
    Example external module implementation with a REST endpoint.

    Reference this class in your config.yaml:

        modules:
          awesome:
            class: modai.modules.external_awesome.module.AwesomeModule
            config:
              greeting: Hello from Awesome!
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self._greeting = config.get("greeting", "Hello!")

        # Add self.router to register REST endpoints (omit if not needed)
        self.router = APIRouter()
        self.router.add_api_route("/api/awesome", self.get_awesome, methods=["GET"])

    def get_awesome(self) -> dict[str, Any]:
        return {"greeting": self._greeting}
```

**`requirements.txt`** — only needed if your module has extra PyPI dependencies:

```
some-extra-lib>=1.0.0
another-lib>=2.0.0
```

Key rules:
- All module constructors **must** use the signature `def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any])`.
- Setting `self.router = APIRouter()` registers the module as a **web module** — its routes are automatically mounted by the server.
- To depend on another module at runtime, declare it in `module_dependencies` in the config (see Step 3) and retrieve it via `self.dependencies.get_module("my_dep_name")`.


### Step 2: Clone Into the Modules Directory

Clone your module repository into `backend/omni/src/modai/modules/` using the `external-` prefix. All directories matching `src/modai/modules/external-*/` are git-ignored and will never be committed to the modAI repository.

```bash
cd backend/omni/src/modai/modules

git clone git@github.com:your-org/my-awesome-module.git external-awesome
```

This results in:

```
backend/omni/src/modai/modules/
├── health/
├── session/
├── ...
└── external-awesome/          # ← your module (git-ignored)
    ├── __init__.py
    ├── module.py
    └── requirements.txt
```

> **Important**: The `external-` prefix is what keeps your module out of the modAI Git history. Always use it.

If your module has extra PyPI dependencies, install them into the shared virtual environment:

```bash
cd backend/omni
uv pip install -r src/modai/modules/external-awesome/requirements.txt
```


### Step 3: Create a Custom Config File

The server loads modules from a config YAML file. Do not edit `config.sample.yaml` or `src/modai/default_config.yaml` directly. Instead, create your own config file that includes the base config and adds your module:

**`my-config.yaml`** (anywhere on your machine or in the project root):

```yaml
includes:
  - path: ./config.sample.yaml   # inherit the base setup

modules:
  awesome:
    class: modai.modules.external_awesome.module.AwesomeModule
    config:
      greeting: "Hello from Awesome!"
```

Point the server at it via the `CONFIG_PATH` environment variable:

```bash
cd backend/omni
CONFIG_PATH=./my-config.yaml uv run uvicorn modai.main:app
```

#### Using module dependencies

If your module needs access to another module (e.g. `session`), declare it in the config and retrieve it in your constructor:

```yaml
modules:
  awesome:
    class: modai.modules.external_awesome.module.AwesomeModule
    config:
      greeting: "Hello!"
    module_dependencies:
      session: "session"   # key used in code → name of the module in this config
```

```python
def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
    super().__init__(dependencies, config)
    self._session = dependencies.get_module("session")
```

---

## External Module Deployment

External modules are loaded at runtime from the `src/` directory — no compilation step is needed. Deploying them requires only that the module files are present in `src/modai/modules/external-NAME/` when the application starts, and that any extra dependencies are installed in the virtual environment.

### Docker Deployment (Recommended)

The easiest way to distribute a custom modAI backend is to build a Docker image with your external modules baked in.

1. **Clone your module** into the modules directory before building:

   ```bash
   cd backend/omni/src/modai/modules
   git clone git@github.com:your-org/my-awesome-module.git external-awesome
   ```

2. **Build the Docker image** — the existing `Dockerfile` already copies all of `src/` into the image, so your external module is included automatically:

   ```bash
   cd backend/omni
   docker image build -t your-registry.com/modai-backend-custom:latest .
   ```

   If your module has a `requirements.txt`, add an install step to the Dockerfile build stage:

   ```dockerfile
   # Build stage — after COPY src/ pyproject.toml /app/
   RUN uv pip install -r /app/src/modai/modules/external-awesome/requirements.txt
   RUN uv sync --no-dev
   ```

3. **Push to your registry**:

   ```bash
   docker image push your-registry.com/modai-backend-custom:latest
   ```

4. **Provide your config** at runtime via the `CONFIG_PATH` environment variable:

   ```bash
   docker run \
     -e CONFIG_PATH=/config/my-config.yaml \
     -v /path/to/my-config.yaml:/config/my-config.yaml \
     your-registry.com/modai-backend-custom:latest
   ```
