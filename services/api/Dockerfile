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
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/drizzle ./services/api/drizzle

# Install pnpm in production stage
RUN npm install -g pnpm
RUN pnpm install --prod

EXPOSE 4000

CMD ["pnpm", "--filter=@simple/api", "run", "start"]
