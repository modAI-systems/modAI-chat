# Svelte + TypeScript + Tailwind + shadcn/ui + Vite

Frontend OMNI supports two different kinds of frontends

* Full fledged with a backend
* Lite without a dedicated backend hosted in the browser only (also only a lmiited set of features available)

## Getting started

```bash
pnpm env use -g 24

pnpm install
pnpm dev
```

The frontend is now available under http://localhost:5173

## External Modules and Dependencies

External modules can be dropped into `src/modules/external-*` and are ignored by git.

Dependency handling is workspace-based:

- `pnpm-workspace.yaml` includes `src/modules/external-*` as optional workspace packages.
- Each external module can define its own `package.json` with its own dependencies.
- The frontend root lockfile remains independent because `shared-workspace-lockfile=false` is set in `.npmrc`.

Important reproducibility note:

- With `shared-workspace-lockfile=false`, each `external-*` package will typically get its own lockfile under `src/modules/external-*`.
- Those external module folders are gitignored in this repository, so their lockfiles are usually not tracked here.
- This means dependency resolution for external modules is not reproducible by default in this repo unless:
	- the external module is maintained in its own repository with a committed lockfile, or
	- dependency versions are pinned tightly enough for your requirements.
- For CI, make sure your external module delivery process includes a reproducibility strategy (for example: committed lockfile in the external module source, prebuilt artifact, or strict version pinning).

Minimal `package.json` example for an external module:

```json
{
	"name": "external-foo",
	"private": true,
	"version": "0.0.0",
	"type": "module",
	"dependencies": {
		"socket.io-client": "^4.8.1"
	}
}
```

Install dependencies from `frontend/omni` as usual:

```bash
pnpm install
```

`pnpm` will install dependencies for the root app and any present `external-*` packages.
