FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY .npmrc ./
COPY services ./services
COPY packages ./packages
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./

RUN pnpm install
# Build packages in dependency order
RUN pnpm --filter=@simple/types run build
RUN pnpm --filter=@simple/config run build
RUN pnpm --filter=@simple/utils run build
RUN pnpm --filter=@simple/ui run build
RUN pnpm --filter=@simple/auth run build
RUN pnpm --filter=@simple/api run build

FROM node:22-bookworm-slim

ENV API_HOST=0.0.0.0
ENV PORT=4000
ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-core \
    fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# Crear configuración básica de fontconfig para sharp/libvips
RUN mkdir -p /etc/fonts && \
    echo '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">\
    <fontconfig>\
    <dir>/usr/share/fonts</dir>\
    <cachedir>/var/cache/fontconfig</cachedir>\
    </fontconfig>' > /etc/fonts/fonts.conf && \
    fc-cache -f -v

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/drizzle.config.ts ./services/api/drizzle.config.ts
COPY --from=builder /app/services/api/drizzle ./services/api/drizzle
COPY --from=builder /app/services/api/entrypoint.sh ./services/api/entrypoint.sh

# Install pnpm and drizzle-kit in production stage
RUN npm install -g pnpm drizzle-kit
RUN pnpm install --prod

# Make entrypoint executable
RUN chmod +x /app/services/api/entrypoint.sh

EXPOSE 4000

# Use entrypoint script that runs migrations before starting
ENTRYPOINT ["/app/services/api/entrypoint.sh"]
