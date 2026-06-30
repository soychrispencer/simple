#!/bin/bash

# Script de deployment para el Cloudflare Worker de Instagram
set -e

echo "🚀 Desplegando Cloudflare Worker para Instagram..."

# Verificar dependencias
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar login en Cloudflare
echo "🔐 Verificando autenticación..."
npx wrangler whoami || (echo "❌ No autenticado. Ejecuta: npx wrangler login" && exit 1)

# Desplegar
echo "🌐 Desplegando Worker..."
npx wrangler deploy

echo "✅ Deployment completado!"
echo ""
echo "Próximos pasos:"
echo "1. Copia la URL del Worker (arriba)"
echo "2. Configura CLOUDFLARE_WORKER_URL en tu .env"
echo "3. Cambia STORAGE_PROVIDER a 'cloudflare-r2'"
echo "4. Reinicia tu API"
echo ""
echo "Para probar el Worker:"
echo "curl -X POST https://tu-worker.workers.dev/overlay \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"imageKey\":\"test.jpg\",\"variant\":\"professional-centered\",\"data\":{\"title\":\"Test\",\"price\":\"UF 100\"}}'"
