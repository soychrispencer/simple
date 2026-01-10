// Patrones de imports prohibidos para reforzar entrypoints únicos.
// Nota: @simple/config/* queda fuera a propósito (se usan assets/preset).

export const restrictedPackageSubpaths = [
  '@simple/ui/*',
  '@simple/auth/*',
  '@simple/shared-types/*',
  '@simple/logging/*',
  '@simple/listings/*',
  '@simple/profile/*',
  '@simple/panel/*',
];

export const restrictedLegacyAliases = [
  '@ui/*',
  '@auth/*',
  '@config/*',
  '@shared-types/*',
];

// Bloquear cualquier subpath de @simple/config EXCEPTO los explícitamente permitidos.
// Nota: `no-restricted-imports` NO soporta `allow` dentro de `patterns`, así que usamos extglob.
export const restrictedImportsForNoRestrictedImports = [
  ...restrictedPackageSubpaths,
  ...restrictedLegacyAliases,
  '@simple/config/!(tailwind-preset|tokens.css)',
];
