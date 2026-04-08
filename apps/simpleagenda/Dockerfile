FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm install --include=dev

FROM deps AS builder

RUN npm run build --workspace=@simple/types
RUN npm run build --workspace=@simple/config
RUN npm run build --workspace=@simple/utils
RUN npm run build --workspace=@simple/ui
RUN npm run build --workspace=@simple/auth
RUN npm run build --workspace=@simple/agenda

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/simpleagenda/public ./apps/simpleagenda/public
COPY --from=builder /app/apps/simpleagenda/.next/standalone ./
COPY --from=builder /app/apps/simpleagenda/.next/static ./apps/simpleagenda/.next/static

EXPOSE 3000

CMD ["node", "apps/simpleagenda/server.js"]
