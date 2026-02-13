FROM node:20-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY eslint.config.mjs eslint.shared.mjs eslint.restricted-imports.mjs ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build --workspace=simpleautos

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app /app

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=simpleautos"]
