FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

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
RUN pnpm --filter=@simple/propiedades run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/simplepropiedades/public ./apps/simplepropiedades/public
COPY --from=builder /app/apps/simplepropiedades/.next/standalone ./
COPY --from=builder /app/apps/simplepropiedades/.next/static ./apps/simplepropiedades/.next/static

EXPOSE 3000

CMD ["node", "apps/simplepropiedades/server.js"]
