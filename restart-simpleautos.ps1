#!/usr/bin/env pwsh
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Reiniciando SimpleAutos con limpieza de cache" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Deteniendo procesos de Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$appDir = Join-Path $PSScriptRoot "apps\simpleautos"
Write-Host "[2/4] Limpiando caché de Next.js..." -ForegroundColor Yellow
$nextDir = Join-Path $appDir ".next"
if (Test-Path $nextDir) {
    Remove-Item -Path $nextDir -Recurse -Force
    Write-Host "      .next/ eliminado" -ForegroundColor Green
} else {
    Write-Host "      .next/ no existe" -ForegroundColor Gray
}

Write-Host "[3/4] Rebuild de @simple/ui..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm run build --workspace=@simple/ui --silent | Out-Null
Write-Host "      @simple/ui rebuild completado" -ForegroundColor Green

Write-Host "[4/4] Iniciando dev server de simpleautos..." -ForegroundColor Yellow
Write-Host ""
Set-Location $appDir
npm run dev
