FROM node:22-bookworm-slim

ENV API_HOST=0.0.0.0
ENV PORT=4000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY services ./services
COPY packages ./packages
COPY apps ./apps
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm install --include=dev
RUN npm run build --workspace=@simple/types
RUN npm run build --workspace=@simple/config
RUN npm run build --workspace=@simple/utils
RUN npm run build --workspace=@simple/ui
RUN npm run build --workspace=@simple/auth
RUN npm run build --workspace=@simple/api

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=@simple/api"]
