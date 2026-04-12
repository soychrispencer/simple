FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY services ./services
COPY packages ./packages
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./

RUN npm install --include=dev
RUN npm run build --workspace=@simple/types
RUN npm run build --workspace=@simple/config
RUN npm run build --workspace=@simple/utils
RUN npm run build --workspace=@simple/ui
RUN npm run build --workspace=@simple/auth
RUN npm run build --workspace=@simple/api

FROM node:22-bookworm-slim

ENV API_HOST=0.0.0.0
ENV PORT=4000
ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/drizzle ./services/api/drizzle

RUN npm install --workspace=@simple/api --omit=dev

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=@simple/api"]
