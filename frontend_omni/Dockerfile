#################
## Build stage ##
#################
FROM node:24-slim AS build

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# Ensure modules.json is not baked into the image
RUN rm -f /app/dist/modules.json

#################
## Final stage ##
#################
FROM caddy:alpine

WORKDIR /app

# Copy built app from build stage
COPY --from=build /app/dist /app

# Copy other resources
COPY resources/Caddyfile /etc/caddy/Caddyfile
COPY resources/entrypoint.sh /entrypoint.sh

EXPOSE 80
EXPOSE 443

# Create modules.json at runtime, then start Caddy
ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
