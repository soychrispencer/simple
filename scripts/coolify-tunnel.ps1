# Usage: .\scripts\coolify-tunnel.ps1 -SshUser <user> [-SshPort 22]
# Requires the dedicated public key installed server-side and a verified host key in known_hosts.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$SshUser,

    [ValidateRange(1, 65535)]
    [int]$SshPort = 22
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$serverHost = '142.44.211.73'
$identityFile = Join-Path $env:USERPROFILE '.ssh\simple-coolify-tunnel'
$knownHostsFile = Join-Path $env:USERPROFILE '.ssh\known_hosts'
$knownHostTarget = if ($SshPort -eq 22) { $serverHost } else { "[$serverHost]:$SshPort" }
$localEndpoints = @(
    '127.0.0.1:18000:127.0.0.1:8000',
    '127.0.0.1:6001:127.0.0.1:6001',
    '127.0.0.1:6002:127.0.0.1:6002'
)
$sshCommand = Get-Command ssh.exe -ErrorAction SilentlyContinue

if (-not $sshCommand) {
    throw 'No se encontró OpenSSH. Instálalo antes de abrir el túnel.'
}
if (-not (Test-Path -LiteralPath $identityFile)) {
    throw "No se encontró la llave privada dedicada: $identityFile"
}
if ($SshUser -notmatch '^[A-Za-z0-9._-]+$') {
    throw 'El usuario SSH solo puede contener letras, números, punto, guion y guion bajo.'
}
if (-not (Test-Path -LiteralPath $knownHostsFile)) {
    throw 'Antes de conectar, verifica la huella SSH desde la consola del proveedor y guarda el host key en ~/.ssh/known_hosts.'
}
$null = & ssh-keygen.exe -F $knownHostTarget -f $knownHostsFile 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "No hay una huella verificada para $knownHostTarget en known_hosts. No se aceptará automáticamente."
}

$sshArguments = @(
    '-i', $identityFile,
    '-p', [string]$SshPort,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes',
    '-o', 'PasswordAuthentication=no',
    '-o', 'KbdInteractiveAuthentication=no',
    '-o', 'StrictHostKeyChecking=yes',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-N'
)

foreach ($localEndpoint in $localEndpoints) {
    $sshArguments += @('-L', $localEndpoint)
}
$sshArguments += "$SshUser@$serverHost"

Write-Host 'Abriendo túnel restringido para Coolify en 127.0.0.1:18000, 6001 y 6002. Presiona Ctrl+C para cerrarlo.'
& $sshCommand.Source @sshArguments
if ($LASTEXITCODE -ne 0) {
    throw "El túnel SSH terminó con código $LASTEXITCODE. Revisa la llave, el usuario y la huella guardada en known_hosts."
}
