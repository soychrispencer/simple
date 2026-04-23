@echo off
echo ==========================================
echo Reiniciando SimpleAutos con limpieza de cache
echo ==========================================
echo.

echo [1/4] Deteniendo procesos de Node.js...
taskkill /F /IM node.exe 2>nul

:: Esperar un momento
ping -n 2 127.0.0.1 >nul

echo [2/4] Limpiando caché de Next.js...
cd /d "%~dp0\..\apps\simpleautos"
if exist .next (
    rmdir /s /q .next
    echo      .next/ eliminado
) else (
    echo      .next/ no existe
)

echo [3/4] Rebuild de @simple/ui...
cd /d "%~dp0\.."
pnpm run build --filter=@simple/ui --silent

echo [4/4] Iniciando dev server de simpleautos...
cd /d "%~dp0\..\apps\simpleautos"
pnpm run dev
