FROM node:20-bookworm-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VERTICAL
ARG NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH
ARG NEXT_PUBLIC_SIMPLE_API_BASE_URL
ARG NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS
ARG NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES
ARG NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VERTICAL=$NEXT_PUBLIC_VERTICAL
ENV NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH=$NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH
ENV NEXT_PUBLIC_SIMPLE_API_BASE_URL=$NEXT_PUBLIC_SIMPLE_API_BASE_URL
ENV NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS=$NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS
ENV NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES=$NEXT_PUBLIC_ENABLE_SIMPLE_API_WRITES
ENV NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES=$NEXT_PUBLIC_SIMPLE_API_STRICT_WRITES

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm ci
RUN npm run build --workspace=simpleautos

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/simpleautos/.next/standalone ./
COPY --from=builder /app/apps/simpleautos/.next/static ./apps/simpleautos/.next/static
COPY --from=builder /app/apps/simpleautos/public ./apps/simpleautos/public

EXPOSE 3000

CMD ["sh", "-c", "node apps/simpleautos/server.js || node server.js"]
