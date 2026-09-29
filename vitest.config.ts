import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [react(), {
        name: 'workspace-app-alias',
        async resolveId(source, importer) {
            if (!source.startsWith('@/') || !importer) return;
            const appRoot = importer.replace(/\\/g, '/').match(/^(.*\/apps\/[^/]+)\//)?.[1];
            if (appRoot) return this.resolve(resolve(appRoot, 'src', source.slice(2)), importer, { skipSelf: true });
        },
    }],
    test: {
        globals: true,
        environment: 'node',
        projects: [
            { extends: true, test: { name: 'node', environment: 'node', include: ['{packages,apps,services}/**/src/**/*.{test,spec}.ts'] } },
            { extends: true, test: { name: 'browser', environment: 'jsdom', include: ['{packages,apps,services}/**/src/**/*.{test,spec}.tsx'] } },
        ],
        setupFiles: ['./vitest.setup.ts'],
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
