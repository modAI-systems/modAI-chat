# AGENTS.md

A comprehensive guide for AI agents working on the modAI-chat project, providing context and instructions for effective development assistance.

## Project Overview

modAI-chat is a full-stack application with separate backend and frontend components:

- **Backend**: Python FastAPI REST API with SQLModel persistence
- **Frontend**: React TypeScript SPA with modular architecture
- **E2E Tests**: Tests covering all different frontends with the (if needed) backend

## General Guidelines

- **KISS Principle**: Always strive for simple and easy solutions
- **No Unasked Refactoring**: Don't refactor existing code unless directly related to the task
- **Library Reuse**: Prefer existing libraries over custom implementations
- **Documentation**: Keep documentation concise; don't create additional docs unless requested
- **Task Planning**: Create TODO items before starting work, prioritizing document reading first
- **Function Order**: Public functions first, then protected, then private
- **Top down functions**: The more specific functions get the further down in a file they should be. The entry point of a file (e.g. a React Compnent) should be on the top, subfunctions then underneeth.
- **Read Architecture first**: Determine if you the work is frontend or backend related and then read the corresponding arch document first.

## Coding Standards

### Python

- **Type Hints**: Use type hints whenever possible
- **Avoid Any**: Minimize use of `Any` type hint (except in dicts like `dict[str, Any]`)
- **List Comprehensions**: Prefer `[x for x in items]` over traditional loops for simple expressions
- **Functional Approach**: Avoid mutating class variables; return new instances
- **Pydantic**: Use v2+ and follow migration guide https://docs.pydantic.dev/latest/migration/
- **Optional Types**: Use pipe operator `str | None` instead of `Optional[str]`
- **Web Error Exposure**: Log full stack traces internally, return generic messages to Web responses to not leak details

### React TypeScript

- **Language**: Use TypeScript over JavaScript
- **File Naming**:
  - Use camelCase for utility files: `userProfile.ts`, `dataService.ts`
  - Use PascalCase for component files: `UserProfileComponent.tsx`
- **Folder Naming**: Use kebab-case: `user-profile`, `data-services`
- **Imports**: Import directly from source modules; avoid re-exports
- **Context Providers**: Use `<Context value={value}>{children}</Context>` pattern over `<Context.Provider>`

### Shell

- **Local Variables**: Make new variables in functions `local` to avoid conflicts with global variables

## modAI Backend Development

### Environment Setup

- **Location**: Work in `backend/` directory. When executing commands, switch to the backend dir.
- **Package Manager**: Use [UV](https://docs.astral.sh/uv/) for dependency management
- **Start Server**: `uv run uvicorn modai.main:app`
- **Install Dependencies**: `uv add <package-name>`

### Architecture Reading Requirements

Before any backend work, read relevant architecture documents:

- **Always read**: `backend/architecture/core.md`
- **Authentication work**: `backend/architecture/auth.md`
- **Chat/AI features**: `backend/architecture/chat.md`
- **Database work**: `backend/architecture/persistence.md`
- **SQLModel work**: https://fastapi.tiangolo.com/tutorial/sql-databases/

### Testing

- **Framework**: pytest
- **Command**: `uv run pytest` or `uv run pytest tests/test_*.py`
- **Location**: `backend/tests/`
- **Test Coverage**: Always add unit tests for new features or bug fixes
- **Test Isolation**: Use mocking for external dependencies
- **Atomic Tests**: Each test function should test one specific behavior

### Persistence

- **Dictionary Storage**: Use SQLAlchemy's `JSON` type for dictionary fields
- **Timestamps**: All HTTP API timestamps in UTC ISO 8601 format


## modAI Frontend Development

### Environment Setup

- **Location**: Work in `frontend_omni/` directory. When executing commands, switch to the frontend dir.
- **Package Manager**: Use `pnpm` (not npm)
- **Start Dev Server**: `pnpm dev`
- **Build**: `pnpm build`
- **Install Dependencies**: `pnpm add <package-name>`

### Architecture Reading Requirements

- **Always read first**: `frontend_omni/architecture/core.md`

### Technology Stack

- **Framework**: React with TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (https://ui.shadcn.com/docs/components)
- **Install UI Components**: `pnpm dlx shadcn@latest add <component-name>`

### UI/UX Guidelines

- **Component Library**: Leverage shadcn/ui components for consistency
- **i18n**: Always translate texts in the Frontend with i18next
- **English**: English is always the fallback language in the code. No need for a own `en.json`
- **Imports**: When you import something from another module group, never use relative imports but always full like `import { foo } from "@/modules/some-module"`. Imports within the same module group should be relative.
- **React Compnents Functions**: Create `function ProviderItem({provider: Provider}) {` over `const renderProviderItem = (provider: Provider) => {`
- **JSX Functions**: JSX should never have a render.. function, but always a proper component function. Compnent functions should never be nested in other functions but on top level
- **pnpm dev**: You should never run `pnpm dev` because this is blocking. Use `pnpm build` instead always.

### Unit Testing

```bash
cd frontend_omni
pnpm test            # Run javascript unit tests (vitest)
pnpm check           # Run linter
```

### Frontend

## E2E Testing

**Note**: Only read this section when working with e2e tests.

For comprehensive e2e testing best practices and patterns, refer to `e2e_tests/BEST_PRACTICES.md`.

## Development Workflow

1. **Read Architecture**: Always read relevant architecture docs first
2. **Create TODOs**: Plan work with structured todo items
3. **Write Tests**: Add tests for new functionality
4. **Build & Verify**: Run build commands to verify changes
5. **No Summaries**: Don't provide task summaries unless requested

## Security Considerations

- **Backend**: Never expose internal error details to users
- **Frontend**: Validate all user inputs
- **Authentication**: Follow architecture guidelines in `backend/architecture/auth.md`

This guide provides AI agents with the essential context needed to work effectively on both backend and frontend components while maintaining project standards and architectural integrity.
