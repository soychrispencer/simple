FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY services ./services
COPY packages ./packages
COPY apps ./apps
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm install
RUN npm run build --workspace=@simple/api

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace=@simple/api"]
