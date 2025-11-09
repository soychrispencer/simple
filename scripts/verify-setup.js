#!/usr/bin/env node

/**
 * Script de verificación del setup del monorepo
 * Verifica que todas las dependencias y configuraciones estén correctas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando setup del monorepo Simple...\n');

const checks = [];

// 1. Verificar que existe pnpm-workspace.yaml
checks.push({
  name: 'pnpm-workspace.yaml existe',
  test: () => fs.existsSync('pnpm-workspace.yaml'),
});

// 2. Verificar que existe turbo.json
checks.push({
  name: 'turbo.json existe',
  test: () => fs.existsSync('turbo.json'),
});

// 3. Verificar package.json root
checks.push({
  name: 'package.json root existe',
  test: () => fs.existsSync('package.json'),
});

// 4. Verificar estructura de carpetas
const requiredDirs = ['apps', 'packages', 'supabase', 'docs', 'PLAN_MAESTRO'];
requiredDirs.forEach((dir) => {
  checks.push({
    name: `Carpeta ${dir}/ existe`,
    test: () => fs.existsSync(dir),
  });
});

// 5. Verificar configs
checks.push({
  name: '.gitignore existe',
  test: () => fs.existsSync('.gitignore'),
});

checks.push({
  name: '.prettierrc existe',
  test: () => fs.existsSync('.prettierrc'),
});

checks.push({
  name: 'README.md existe',
  test: () => fs.existsSync('README.md'),
});

// 6. Verificar packages de config
checks.push({
  name: '@simple/eslint-config existe',
  test: () => fs.existsSync('packages/config/eslint-config/package.json'),
});

checks.push({
  name: '@simple/typescript-config existe',
  test: () => fs.existsSync('packages/config/typescript-config/package.json'),
});

// 7. Verificar node_modules
checks.push({
  name: 'node_modules instalado',
  test: () => fs.existsSync('node_modules'),
});

// 8. Verificar git
checks.push({
  name: 'Git inicializado',
  test: () => fs.existsSync('.git'),
});

// Ejecutar verificaciones
let passed = 0;
let failed = 0;

checks.forEach((check) => {
  const result = check.test();
  if (result) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}`);
    failed++;
  }
});

console.log(`\n📊 Resultados: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 Todo está correctamente configurado!');
  console.log('\n🚀 Próximos pasos:');
  console.log('   1. Configurar variables de entorno (.env.local)');
  console.log('   2. Comenzar con Fase 1: Foundation');
  console.log('   3. Crear @simple/ui package');
  console.log('\n📚 Lee la documentación en /PLAN_MAESTRO/\n');
  process.exit(0);
} else {
  console.log('⚠️  Hay problemas con el setup. Por favor revisa los errores.\n');
  process.exit(1);
}
