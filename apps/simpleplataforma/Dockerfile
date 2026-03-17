FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY docs ./docs
COPY *.mjs ./
COPY *.cjs ./
COPY *.json ./
COPY *.md ./

RUN npm install
RUN npm run build --workspace=@simple/simpleplataforma

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@simple/simpleplataforma"]
