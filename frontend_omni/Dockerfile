#################
## Build stage ##
#################
FROM node:24-slim AS build

# Set working directory
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

#################
## Final stage ##
#################
FROM caddy:alpine

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/caddy/html

# Copy Caddyfile
COPY resources/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
