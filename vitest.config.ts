import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'node',
        environmentMatchGlobs: [
            ['**/*.{test,spec}.tsx', 'jsdom'],
        ],
        setupFiles: ['./vitest.setup.ts'],
        include: [
            'packages/**/src/**/*.{test,spec}.{ts,tsx}',
            'apps/**/src/**/*.{test,spec}.{ts,tsx}',
            'services/**/src/**/*.{test,spec}.{ts,tsx}',
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '**/build/**',
            '**/coverage/**',
        ],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/*.d.ts',
                '**/*.config.{ts,js,mjs}',
                '**/scripts/**',
                '**/.next/**',
            ],
        },
    },
});
