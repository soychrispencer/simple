import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { restrictedImportsForNoRestrictedImports } from './eslint.restricted-imports.mjs';

export const sharedIgnores = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/tsconfig.tsbuildinfo',
];

export const sharedConfig = [
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Regla clave: forzar entrypoints únicos (sin subpaths), excepto @simple/config/* (assets/preset permitidos).
      'no-restricted-imports': [
        'error',
        {
          patterns: restrictedImportsForNoRestrictedImports,
        },
      ],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

// Overrides comunes para apps Next (mantener build/lint rápido y evitar reglas Next que no aplican al monorepo).
export const appTypeScriptRelaxedConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
    },
  },
];

export const appNextRelaxedConfig = [
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];
