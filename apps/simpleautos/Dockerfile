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
RUN npm run build --workspace=simpleautos

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

WORKDIR /app

COPY --from=builder /app/apps/simpleautos/.next/standalone ./
COPY --from=builder /app/apps/simpleautos/.next/static ./apps/simpleautos/.next/static
COPY --from=builder /app/apps/simpleautos/public ./apps/simpleautos/public

EXPOSE 3001

CMD ["sh", "-c", "node apps/simpleautos/server.js || node server.js"]
