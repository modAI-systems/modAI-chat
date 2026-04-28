# NOTE: Must be built from the repo root, not from docs/:
#   docker build -f docs/Dockerfile -t modai-docs:latest .
#
#################
## Build stage ##
#################
FROM node:24-slim AS build

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm

# Copy docs and the referenced external source files
COPY docs/ ./docs/
COPY backend/omni/src/modai/ ./backend/omni/src/modai/
COPY frontend/omni/public/ ./frontend/omni/public/

# Install dependencies and build
WORKDIR /workspace/docs
RUN pnpm install --frozen-lockfile
RUN pnpm build

#################
## Final stage ##
#################
FROM caddy:alpine

COPY --from=build /workspace/docs/doc_build /srv

EXPOSE 8080

CMD ["caddy", "file-server", "--root", "/srv", "--listen", ":8080"]
