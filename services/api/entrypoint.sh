#!/bin/sh
set -e

echo "[Entrypoint] Starting API container setup..."
echo "[Entrypoint] Current directory: $(pwd)"
echo "[Entrypoint] Node version: $(node --version)"
echo "[Entrypoint] Npm version: $(npm --version)"

echo "[Entrypoint] Installing drizzle-kit globally..."
npm install -g drizzle-kit || {
    echo "[Entrypoint] ERROR: Failed to install drizzle-kit globally"
    exit 1
}

cd /app/services/api

echo "[Entrypoint] Installing drizzle-kit locally in API directory..."
npm install drizzle-kit --save-dev || {
    echo "[Entrypoint] ERROR: Failed to install drizzle-kit locally"
    exit 1
}

echo "[Entrypoint] Checking drizzle.config.ts exists..."
if [ ! -f "drizzle.config.ts" ]; then
    echo "[Entrypoint] ERROR: drizzle.config.ts not found!"
    ls -la
    exit 1
fi

echo "[Entrypoint] Running database migrations..."
npx drizzle-kit migrate --config=drizzle.config.ts || {
    echo "[Entrypoint] WARNING: Migration failed or no migrations to run. Continuing..."
}

echo "[Entrypoint] Starting API server..."
exec pnpm --filter=@simple/api run start
