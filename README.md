# modAI Chat (modular AI Chat)

[![CI](https://github.com/modAI-systems/modAI-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/modAI-systems/modAI-chat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Highly extendable AI Web Chat UI from the community for the community.

![modAI Browser Interface](resources/modai-browser-only.png)

> ⚠️ **Early Development Stage**: This repository is in a very early stage of development. Features may be incomplete, APIs may change, and breaking changes are expected.

**🤝 We are looking for co-maintainers!**

## ✨ Features

* 🗨️ OpenAI Chat integration
* 🧩 Modular architecture for easy extensibility


## 🏗️ Repository Structure

We try to keep the root of the repo slim and add things like `package.json` file where it actually belongs to.

```
modAI-chat/
├── backend/
│   ├── omni/              # Python FastAPI backend
│   └── tools/dice-roller/ # Example tool microservice
├── frontend/
│   └── omni/              # Svelte TypeScript SPA
└── e2e_tests/
    ├── tests_omni_full/   # Playwright E2E – full stack
    └── tests_omni_light/  # Playwright E2E – light
```

## 🖥️ modAI Frontends

In modAI there is not the one-and-only frontend but we (potentially) have more than one, or even transitioning from one to another (e.g. rewrite).
Why more than one frontend: because there are different use cases. e.g. one full fledged frontend containing all features the backend offers and a second one very small chat bubble frontend which can be used to be integrated in existing sites.

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 24+
- UV package manager
- Docker (for NanoIDP identity provider)
- Optional: [just](https://github.com/casey/just)

### NanoIDP Setup (Identity Provider)
Start the lightweight local OIDC identity provider (runs on port 9000):

```bash
docker compose -f resources/compose-files/compose-nanoidp.yaml up -d
```
nanoidp Dashboard: http://localhost:9000

### Backend Setup
```bash
cd backend/omni
cp .env.sample .env
uv sync
uv run uvicorn modai.main:app --reload
```

### Frontend Setup
```bash
cd frontend/omni
ln -sf modules_with_backend.json public/modules.json
pnpm install
pnpm dev
```

Browse to http://localhost:5173/

User: `user1`
Password: `password`

## 🔌 External Module / Plugin Development

modAI's modular architecture allows you to develop your own modules in separate repositories and integrate them into the frontend and backend.

- **Frontend modules**: See [frontend/omni/docs/EXTERNAL-MODULE-DEVELOPMENT.md](frontend/omni/docs/EXTERNAL-MODULE-DEVELOPMENT.md) for a step-by-step guide on creating, integrating, and deploying custom frontend modules.
- **Backend modules**: See [backend/omni/docs/EXTERNAL-MODULE-DEVELOPMENT.md](backend/omni/docs/EXTERNAL-MODULE-DEVELOPMENT.md) for extending the backend with custom modules.

## 🤝 Contribution

Contributions are welcome in form of pull requests, issues or discussions. If you plan to implement something new or bigger, it is advisable to start a discussion first.

For details, see our [contribution guidelines](CONTRIBUTION.md)

## 👥 Shared Responsibility

There are plenty of successful repos out in the wild which are lead by single persons, but often this overwhelms and stresses
the maintainer and obviously leads to a very bad work-life balance.

We believe that a one-man-show is not the right way and therefore
are happy if you also want to take over responsibility. The whole
project is divided into different chunks with dedicated responsible
persons.

| Component | Overall responsibility |
|-----------|-------------------|
| frontend/omni  | @guenhter and maybe you? |
| backend   | @guenhter and maybe you? |
| CI/CD   | @guenhter and maybe you? |

The responsibilities for frontend and backend are defined more granular in the respective `README.md` files.

## 📄 License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and development milestones.
