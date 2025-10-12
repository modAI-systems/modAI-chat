# AGENTS.md

A comprehensive guide for AI agents working on the modAI-chat project, providing context and instructions for effective development assistance.

## Project Overview

modAI-chat is a full-stack application with separate backend and frontend components:

- **Backend**: Python FastAPI REST API with SQLModel persistence
- **Frontend**: React TypeScript SPA with modular architecture

## General Guidelines

- **KISS Principle**: Always strive for simple and easy solutions
- **No Unasked Refactoring**: Don't refactor existing code unless directly related to the task
- **Library Reuse**: Prefer existing libraries over custom implementations
- **Documentation**: Keep documentation concise; don't create additional docs unless requested
- **Task Planning**: Create TODO items before starting work, prioritizing document reading first
- **Function Order**: Public functions first, then protected, then private

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
- **Command**: `uv run pytest`
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
- **Module specific doc**: `frontend_omni/src/moduleif/*.md` contains specific documentation for module interfaces.

### Technology Stack

- **Framework**: React with TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (https://ui.shadcn.com/docs/components)
- **Install UI Components**: `pnpm dlx shadcn@latest add <component-name>`

### UI/UX Guidelines

- **Component Library**: Leverage shadcn/ui components for consistency

## Module System

The frontend uses a modular architecture with dynamic module loading:

- **Module Location**: `frontend_omni/src/modules/`
- **Module Manifest**: `frontend_omni/public/modules/manifest.json`
- **Module Interfaces**: Defined in `frontend_omni/src/moduleif/`

Details are available in the architecture `core.md` documentation.

### Module Development

- Modules can export sidebar items, router entries, services and more.
- Update `manifest.json` when adding new modules

## Testing Commands

### Backend

```bash
cd backend
uv run pytest                    # Run all tests
uv run pytest tests/test_*.py   # Run specific test file
```

### Frontend

```bash
cd frontend_omni
pnpm test                       # Run tests
pnpm build                      # Build for production
pnpm lint                       # Run linter
```

## Development Workflow

1. **Read Architecture**: Always read relevant architecture docs first
2. **Create TODOs**: Plan work with structured todo items
3. **Write Tests**: Add tests for new functionality
4. **Build & Verify**: Run build commands to verify changes
5. **No Summaries**: Don't provide task summaries unless requested

## File Structure

```
modAI-chat/
├── backend/                    # Python FastAPI backend
│   ├── src/modai/             # Main application code
│   ├── tests/                 # Test files
│   └── architecture/          # Architecture documentation
└── frontend_omni/             # React TypeScript frontend
    ├── src/
    │   ├── modules/           # Feature modules
    │   ├── moduleif/          # Module interfaces
    │   └── shadcn/            # UI components
    ├── public/modules/        # Module manifest
    └── architecture/          # Architecture documentation
```

## Security Considerations

- **Backend**: Never expose internal error details to users
- **Frontend**: Validate all user inputs
- **Authentication**: Follow architecture guidelines in `backend/architecture/auth.md`

This guide provides AI agents with the essential context needed to work effectively on both backend and frontend components while maintaining project standards and architectural integrity.
