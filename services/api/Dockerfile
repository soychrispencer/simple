FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY scripts ./scripts
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm ci
RUN npm run build --workspace=simple-api
RUN npm prune --omit=dev --workspace=simple-api --include-workspace-root

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/dist ./services/api/dist

EXPOSE 4000

WORKDIR /app/services/api

CMD ["node", "dist/src/index.js"]
