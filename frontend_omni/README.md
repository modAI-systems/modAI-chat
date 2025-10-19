# React + TypeScript + Tailwind + shadcn/ui + Vite

## Getting started

```bash
pnpm env use -g 24

pnpm install
pnpm dev
```

The frontend is now available under http://localhost:5173

## Naming Conventions

**React Compionents**: PascalCase
**React Services/Hooks**: camalCase
**Folders**: kebab-case

## Testiong

### VS Code Cucumber Extension

In order to make the cucumber extension find cucumber tests, the paths must be adapted for

- `cucumber.features` and
- `cucumber.glue`.

The `frontend_onmi` must be prepended to all the paths.
