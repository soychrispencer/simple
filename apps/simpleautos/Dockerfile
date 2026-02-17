FROM node:20-bookworm-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VERTICAL
ARG NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VERTICAL=$NEXT_PUBLIC_VERTICAL
ENV NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH=$NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY backend ./backend
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
