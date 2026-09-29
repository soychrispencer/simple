/**
 * Lanza Adobe Illustrator 2026 y ejecuta build-publica-gratis.jsx
 * Uso: node run-illustrator.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsx = join(__dirname, 'build-publica-gratis.jsx');
const prepare = join(__dirname, 'prepare-assets.mjs');
const aiExe =
    process.env.ILLUSTRATOR_EXE ||
    'C:\\Program Files\\Adobe\\Adobe Illustrator 2026\\Support Files\\Contents\\Windows\\Illustrator.exe';

if (!existsSync(aiExe)) {
    console.error('No se encontró Illustrator 2026 en:', aiExe);
    process.exit(1);
}
if (!existsSync(jsx)) {
    console.error('Falta el script:', jsx);
    process.exit(1);
}

console.log('1/2 Preparando assets…');
const prep = spawnSync(process.execPath, [prepare], { stdio: 'inherit', cwd: __dirname });
if (prep.status !== 0) process.exit(prep.status || 1);

const ps = `
$ErrorActionPreference = 'Stop'
$exe = '${aiExe.replace(/'/g, "''")}'
$jsx = '${jsx.replace(/\\/g, '/').replace(/'/g, "''")}'
Write-Host "Starting Illustrator..."
$ai = $null
try {
  $ai = [Runtime.InteropServices.Marshal]::GetActiveObject('Illustrator.Application')
  Write-Host "Attached to running Illustrator"
} catch {
  Write-Host "Launching new Illustrator instance..."
  Start-Process -FilePath $exe
  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    try {
      $ai = [Runtime.InteropServices.Marshal]::GetActiveObject('Illustrator.Application')
      if ($ai) { break }
    } catch {}
  }
}
if (-not $ai) { throw 'No se pudo conectar a Illustrator.Application' }
try { $ai.UserInteractionLevel = -1 } catch {}
Write-Host "Running JSX: $jsx"
$result = $ai.DoJavaScriptFile($jsx)
Write-Host "JSX result: $result"
Write-Host "DONE"
`;

const psPath = join(__dirname, '.run-ai.ps1');
writeFileSync(psPath, ps, 'utf8');

console.log('2/2 Illustrator:', aiExe);
console.log('Script:', jsx);

const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath],
    { stdio: 'inherit', windowsHide: false },
);

child.on('exit', (code) => {
    process.exit(code ?? 1);
});
