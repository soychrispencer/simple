[CmdletBinding()]
param(
  # Archivo fuente con tus secretos (NO se commitea). Recomendado: `.env` en el root.
  [Parameter(Mandatory = $false)]
  [string]$SourceEnv = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) ".env"),

  # Sobrescribe archivos destino si ya existen.
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EnvFileMap {
  param([Parameter(Mandatory = $true)][string]$Path)

  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "No existe el archivo fuente: $Path"
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0) { return }
    if ($line.StartsWith("#")) { return }

    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }

    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1)
    if ($key.Length -eq 0) { return }

    $map[$key] = $val
  }

  return $map
}

function Set-EnvVarDefaults {
  param(
    [Parameter(Mandatory = $true)]$Vars
  )

  # Aliases para Next.js si el usuario solo definió SUPABASE_*
  if (-not $Vars.ContainsKey("NEXT_PUBLIC_SUPABASE_URL") -and $Vars.ContainsKey("SUPABASE_URL")) {
    $Vars["NEXT_PUBLIC_SUPABASE_URL"] = $Vars["SUPABASE_URL"]
  }
  if (-not $Vars.ContainsKey("NEXT_PUBLIC_SUPABASE_ANON_KEY") -and $Vars.ContainsKey("SUPABASE_ANON_KEY")) {
    $Vars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = $Vars["SUPABASE_ANON_KEY"]
  }

  return $Vars
}

function Set-EnvFromTemplate {
  param(
    [Parameter(Mandatory = $true)][string]$TemplatePath,
    [Parameter(Mandatory = $true)][string]$DestPath,
    [Parameter(Mandatory = $true)]$Vars
  )

  if (-not (Test-Path -LiteralPath $TemplatePath)) {
    throw "No existe template: $TemplatePath"
  }

  if ((Test-Path -LiteralPath $DestPath) -and -not $Force) {
    Write-Host "SKIP (ya existe): $DestPath"
    return
  }

  $content = Get-Content -LiteralPath $TemplatePath -Raw

  # Si el destino ya existe, preserva sus valores no-Supabase.
  $existing = @{}
  if (Test-Path -LiteralPath $DestPath) {
    try {
      $existing = Get-EnvFileMap -Path $DestPath
    } catch {
      $existing = @{}
    }
  }

  $keys = @(
    "SUPABASE_PROJECT_ID",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STAGING_DB_URL",
    "SUPABASE_PROD_DB_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )

  # Primero, aplica valores existentes (no-Supabase) si están en el template.
  foreach ($k in $existing.Keys) {
    if ($keys -contains $k) { continue }
    $pattern = "(?m)^(" + [regex]::Escape($k) + ")=.*$"
    if ([regex]::IsMatch($content, $pattern)) {
      $content = [regex]::Replace($content, $pattern, ('$1=' + $existing[$k]))
    }
  }

  foreach ($key in $keys) {
    if (-not $Vars.ContainsKey($key)) { continue }

    $value = $Vars[$key]

    # Reemplaza línea existente KEY=...
    $pattern = "(?m)^(" + [regex]::Escape($key) + ")=.*$"
    if ([regex]::IsMatch($content, $pattern)) {
      $content = [regex]::Replace($content, $pattern, ('$1=' + $value))
    } else {
      # Si no existe, lo agrega al final.
      if (-not $content.EndsWith("`n")) { $content += "`n" }
      $content += "$key=$value`n"
    }
  }

  $destDir = Split-Path -Parent $DestPath
  if (-not (Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
  }

  Set-Content -LiteralPath $DestPath -Value $content -Encoding utf8
  Write-Host "WROTE: $DestPath"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$vars = Set-EnvVarDefaults (Get-EnvFileMap -Path $SourceEnv)

Write-Host "Fuente: $SourceEnv" -ForegroundColor Cyan

# Supabase CLI
$supabaseExample = Join-Path $root "backend\supabase\.env.example"
$supabaseDest = Join-Path $root "backend\supabase\.env"
if (Test-Path -LiteralPath $supabaseExample) {
  Set-EnvFromTemplate -TemplatePath $supabaseExample -DestPath $supabaseDest -Vars $vars
}

# Apps (Next)
$appExamples = Get-ChildItem -LiteralPath (Join-Path $root "apps") -Directory |
  ForEach-Object { Join-Path $_.FullName ".env.example" } |
  Where-Object { Test-Path -LiteralPath $_ }

foreach ($example in $appExamples) {
  $appDir = Split-Path -Parent $example
  $dest = Join-Path $appDir ".env.local"
  Set-EnvFromTemplate -TemplatePath $example -DestPath $dest -Vars $vars
}

Write-Host "Listo. (No se imprimieron valores de secretos)" -ForegroundColor Green
Write-Host "Tip: usa -Force para sobrescribir destinos existentes." -ForegroundColor DarkGray
