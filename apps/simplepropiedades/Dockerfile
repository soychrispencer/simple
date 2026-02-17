FROM node:20-bookworm-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

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
RUN npm run build --workspace=simplepropiedades

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

WORKDIR /app

COPY --from=builder /app/apps/simplepropiedades/.next/standalone ./
COPY --from=builder /app/apps/simplepropiedades/.next/static ./apps/simplepropiedades/.next/static
COPY --from=builder /app/apps/simplepropiedades/public ./apps/simplepropiedades/public

EXPOSE 3002

CMD ["sh", "-c", "node apps/simplepropiedades/server.js || node server.js"]
