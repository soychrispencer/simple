import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

const noopRule = { meta: { schema: [] }, create: () => ({}) };
const stubPlugin = (rules) => ({
    rules: Object.fromEntries(rules.map((name) => [name, noopRule])),
});

const reactHooksPlugin = stubPlugin(['exhaustive-deps', 'rules-of-hooks']);
const reactPlugin = stubPlugin(['no-danger', 'jsx-key', 'no-unescaped-entities']);
const nextPlugin = stubPlugin(['no-img-element', 'no-html-link-for-pages']);
const tsPlugin = stubPlugin([
    'no-var-requires',
    'no-explicit-any',
    'no-unused-vars',
    'no-empty-function',
    'ban-ts-comment',
]);

const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    fetch: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
    Blob: 'readonly',
    File: 'readonly',
    FormData: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    queueMicrotask: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    sessionStorage: 'readonly',
    localStorage: 'readonly',
    HTMLElement: 'readonly',
    HTMLDivElement: 'readonly',
    HTMLInputElement: 'readonly',
    HTMLFormElement: 'readonly',
    HTMLButtonElement: 'readonly',
    HTMLAnchorElement: 'readonly',
    HTMLImageElement: 'readonly',
    HTMLTextAreaElement: 'readonly',
    HTMLSelectElement: 'readonly',
    Node: 'readonly',
    Element: 'readonly',
    Event: 'readonly',
    MouseEvent: 'readonly',
    KeyboardEvent: 'readonly',
    PointerEvent: 'readonly',
    TouchEvent: 'readonly',
    DragEvent: 'readonly',
    FocusEvent: 'readonly',
    InputEvent: 'readonly',
    AbortController: 'readonly',
    AbortSignal: 'readonly',
    crypto: 'readonly',
    atob: 'readonly',
    btoa: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    React: 'readonly',
};

const nodeGlobals = {
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    global: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setImmediate: 'readonly',
    clearImmediate: 'readonly',
    require: 'readonly',
    module: 'readonly',
    exports: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    fetch: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
    Blob: 'readonly',
    File: 'readonly',
    FormData: 'readonly',
    AbortController: 'readonly',
    AbortSignal: 'readonly',
    queueMicrotask: 'readonly',
    crypto: 'readonly',
};

const serviceWorkerGlobals = {
    self: 'readonly',
    clients: 'readonly',
    caches: 'readonly',
    fetch: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    skipWaiting: 'readonly',
};

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/*.min.js',
            '**/drizzle/meta/**',
            '**/drizzle/migrations/**',
            '**/.turbo/**',
            '**/.cache/**',
            '**/next-env.d.ts',
            'pnpm-lock.yaml',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...nodeGlobals, TextDecoder: 'readonly', TextEncoder: 'readonly' },
        },
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'no-console': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooksPlugin,
            react: reactPlugin,
            '@next/next': nextPlugin,
            '@typescript-eslint': tsPlugin,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...browserGlobals, ...nodeGlobals },
        },
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-useless-escape': 'warn',
        },
    },
    {
        files: ['apps/**/*.{ts,tsx}'],
        languageOptions: {
            globals: { ...browserGlobals, ...nodeGlobals },
        },
    },
    {
        files: ['services/api/**/*.ts', '**/scripts/**/*.{ts,js,mjs}', '**/*.config.{ts,js,mjs}'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['**/public/**/sw.js', '**/public/**/service-worker.js'],
        languageOptions: {
            globals: { ...serviceWorkerGlobals },
        },
        rules: {
            'no-undef': 'off',
        },
    },
];
