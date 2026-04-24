#!/bin/sh
set -e

echo "[Entrypoint] Installing drizzle-kit..."
npm install -g drizzle-kit

echo "[Entrypoint] Running database migrations..."
cd /app/services/api
npx drizzle-kit migrate --config=drizzle.config.ts

echo "[Entrypoint] Starting API server..."
exec pnpm --filter=@simple/api run start
