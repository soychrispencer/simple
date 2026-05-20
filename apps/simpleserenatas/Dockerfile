FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN npm install -g pnpm@9.15.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN pnpm install

FROM deps AS builder

RUN pnpm --filter=@simple/types run build
RUN pnpm --filter=@simple/config run build
RUN pnpm --filter=@simple/utils run build
RUN pnpm --filter=@simple/ui run build
RUN pnpm --filter=@simple/auth run build
RUN pnpm --filter=@simple/marketplace-header run build
RUN pnpm --filter=@simple/serenatas run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/simpleserenatas/public ./apps/simpleserenatas/public
COPY --from=builder /app/apps/simpleserenatas/.next/standalone ./
COPY --from=builder /app/apps/simpleserenatas/.next/static ./apps/simpleserenatas/.next/static

EXPOSE 3000

CMD ["node", "apps/simpleserenatas/server.js"]
