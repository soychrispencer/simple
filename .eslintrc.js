module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
  rules: {
    // Error prevention
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    
    // Best practices
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    
    // Console warnings (allow error/warn, warn on log)
    'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
    
    // React/Next.js specific
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-img-element': 'off', // Allow img for performance-critical cases
  },
  overrides: [
    {
      // API routes can use console.log for debugging
      files: ['services/api/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Scripts can use console
      files: ['**/scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
