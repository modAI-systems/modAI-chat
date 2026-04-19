# External Module Development & Deployment

This guide walks you through developing and deploying your own external modules for the modAI frontend.

## External Module Development

### Overview

External modules are self-contained extensions that live in their own Git repositories, separate from the main modAI codebase. During development, they are cloned into the frontend source tree under a special naming convention so they integrate seamlessly with the build system without polluting the main repository.

### Step 1: Create Your Module Repository

Create a new Git repository for your module. The repository root should contain the module source files directly (no `src/` subdirectory).

A minimal module looks like this:

```
my-awesome-module/
├── package.json              # npm dependencies (if any)
├── MyComponent.svelte        # Svelte component(s)
└── myRouteDefinition.svelte.ts  # Route definition (if needed)
```

**Example `package.json`** (only needed if your module has its own npm dependencies):

```json
{
  "name": "my-awesome-module",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "some-npm-package": "^1.0.0"
  }
}
```

**Example component (`MyComponent.svelte`)**:

```svelte
<script lang="ts">
// Use absolute imports for other modAI modules
import type { Routes } from "@/modules/router/index.svelte";
</script>

<p>Hello from my external module!</p>
```

**Example route definition (`myRouteDefinition.svelte.ts`)**:

```typescript
import type { Routes } from "../router/index.svelte";
import MyComponent from "./MyComponent.svelte";

export const MY_PATH = "/my-page";

export function create(): Routes {
    return {
        [MY_PATH]: MyComponent,
    };
}
```

### Step 2: Clone Into the Frontend Module Directory

Clone your module repository into `frontend/omni/src/modules/` using the `external-` prefix. All directories matching `src/modules/external-*` are in the `.gitignore`, so they will never be committed to the modAI repository.

```bash
cd frontend/omni/src/modules

# Clone under the external- prefix
git clone git@github.com:your-org/my-awesome-module.git external-my-awesome-module
```

This results in:

```
frontend/omni/src/modules/
├── fetch-service/
├── router/
├── ...
└── external-my-awesome-module/   # ← your module (git-ignored)
    ├── package.json
    ├── MyComponent.svelte
    └── myRouteDefinition.svelte.ts
```

> **Important**: The `external-` prefix is what keeps your module out of the modAI Git history. Always use it.

If your module has its own `package.json` with npm dependencies, run `pnpm install` from the frontend root to pick them up (pnpm workspaces will detect the nested package):

```bash
cd frontend/omni
pnpm install
```

### Step 3: Create a Custom Module Configuration

The frontend loads its module graph from `public/modules.json`. All files matching `public/modules*.json` are git-ignored, except the two built-in presets (`modules_browser_only.json` and `modules_with_backend.json`). This means you can freely create custom configurations without affecting the repository.

Copy an existing preset as your starting point:

```bash
cd frontend/omni
cp public/modules_with_backend.json public/modules_my_project.json
```

Now edit `public/modules_my_project.json` to register your external module. The easiest approach is to use the `includes` feature to inherit an existing preset and only add your extensions:

**`public/modules_my_project.json`**:

```json
{
  "version": "1.0.0",
  "includes": [
    { "path": "modules_with_backend.json" }
  ],
  "modules": [
    {
      "id": "my-awesome-route",
      "type": "Routes",
      "path": "@/modules/external-my-awesome-module/myRouteDefinition/create",
      "dependencies": {}
    },
    {
      "id": "routing-main",
      "collisionStrategy": "merge",
      "dependencies": {
        "module:routes": ["my-awesome-route"]
      }
    }
  ]
}
```

Key points:
- **`includes`** pulls in all modules from the referenced preset, so you don't have to duplicate the entire configuration.
- **`collisionStrategy: "merge"`** on `routing-main` merges your new route into the existing routes list instead of replacing it.
- **`path`** uses the `@/modules/external-my-awesome-module/...` prefix to point at your cloned module.

### Step 4: Activate Your Configuration

Symlink your custom module configuration to `modules.json`:

```bash
cd frontend/omni
ln -sf modules_my_project.json public/modules.json
```

### Step 5: Start the Dev Server

```bash
cd frontend/omni
pnpm install   # picks up any new dependencies from external modules
pnpm dev
```

🎉🚀 **That's it!** Your external module is now loaded and accessible in the running application. Happy hacking! 🛠️✨

---

## External Module Deployment

At this time, external modules are compiled into the application at build time. It is **not** supported to dynamically load external modules into a pre-built modAI frontend at runtime. This means deploying external modules requires building the full application with all desired modules included.

### Building With External Modules

The build process is the same as a regular build, but you must ensure:

1. All external module repositories are cloned into `src/modules/external-*`
2. Their npm dependencies are installed (`pnpm install`)
3. Your custom `modules.json` is in place (or symlinked)

```bash
cd frontend/omni
pnpm build
```

The resulting `dist/` folder contains the complete application with your external modules baked in.

### Docker Deployment (Recommended)

The easiest way to build and distribute a custom modAI frontend is to build the Docker image with your external modules included. This produces a self-contained, deployable artifact that can be published to your own container registry.

1. **Prepare the build context** — clone external modules and set up the module configuration:

   ```bash
   cd frontend/omni/src/modules
   git clone git@github.com:your-org/my-awesome-module.git external-my-awesome-module

   cd frontend/omni
   # Set up your custom modules.json (see Step 3 & 4 above)
   ln -sf modules_my_project.json public/modules.json
   pnpm install
   ```

2. **Build the Docker image**:

   ```bash
   cd frontend/omni
   docker image build -t your-registry.com/modai-frontend-custom:latest .
   ```

3. **Push to your registry**:

   ```bash
   docker image push your-registry.com/modai-frontend-custom:latest
   ```

This gives you a production-ready container image with your custom module set, ready to deploy wherever you run Docker containers.
