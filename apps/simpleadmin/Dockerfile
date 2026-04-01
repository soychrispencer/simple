FROM node:22-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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
RUN npm run build --workspace=@simple/config
RUN npm run build --workspace=@simple/ui
RUN npm run build --workspace=@simple/auth
RUN npm run build --workspace=@simple/simpleadmin

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@simple/simpleadmin"]
