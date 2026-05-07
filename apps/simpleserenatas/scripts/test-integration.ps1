$ErrorActionPreference = 'Stop'

# SimpleSerenatas Integration Test Script (PowerShell)
# Uso:
#   pwsh ./scripts/test-integration.ps1

$apiUrl = if ($env:API_URL) { $env:API_URL } else { 'http://localhost:4000' }
$frontendUrl = if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { 'http://localhost:3005' }

Write-Host "🎵 SimpleSerenatas Integration Tests (PowerShell)"
Write-Host "==============================================="
Write-Host ""
Write-Host "API URL: $apiUrl"
Write-Host "Frontend URL: $frontendUrl"
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    try {
        Invoke-WebRequest -Method Get -Uri $Url -UseBasicParsing | Out-Null
        Write-Host "  ✅ $Name"
        return $true
    } catch {
        Write-Host "  ❌ $Name"
        return $false
    }
}

Write-Host "Test 1: API Health Check"
$apiOk = Test-Endpoint -Name "API responde /health" -Url "$apiUrl/health"
if (-not $apiOk) {
    Write-Host ""
    Write-Host "Deteniendo: API no disponible."
    exit 1
}

Write-Host "Test 2: Módulo Serenatas (sin auth)"
try {
    Invoke-WebRequest -Method Get -Uri "$apiUrl/api/serenatas/musicians" -UseBasicParsing | Out-Null
    Write-Host "  ✅ Serenatas API accesible"
} catch {
    Write-Host "  ⚠️  Serenatas API respondió error (normal si requiere auth)"
}

Write-Host "Test 3: Frontend disponible"
try {
    Invoke-WebRequest -Method Get -Uri $frontendUrl -UseBasicParsing | Out-Null
    Write-Host "  ✅ Frontend responde"
} catch {
    Write-Host "  ❌ Frontend no responde"
}

Write-Host "Test 4: Build artifacts frontend"
if (Test-Path ".next") {
    Write-Host "  ✅ Carpeta .next presente"
} else {
    Write-Host "  ⚠️  Carpeta .next no encontrada"
}

Write-Host "Test 5: Variables de entorno locales"
if ((Test-Path ".env.local") -or (Test-Path ".env")) {
    Write-Host "  ✅ Archivo de entorno presente"
} else {
    Write-Host "  ⚠️  No se encontró .env.local ni .env"
}

Write-Host ""
Write-Host "==============================================="
Write-Host "✅ Smoke técnico base completado"
Write-Host ""
Write-Host "Siguiente validación manual recomendada (Fase 3):"
Write-Host "  1) /cuadrilla -> invitar músico"
Write-Host "  2) /invitaciones -> aceptar invitación"
Write-Host "  3) /grupos -> crear grupo"
Write-Host "  4) /grupos/:id -> agregar músico + confirmar"
Write-Host "  5) reintentar agregar para verificar bloqueo por estado (409)"
