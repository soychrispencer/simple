import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

const APP_MODE_STORAGE_KEY = 'serenatas-app-mode';

const DEFAULT_APP_ORIGIN = 'http://localhost:3005';
const DEFAULT_API_URL = 'http://localhost:4000';

export function e2eCredentials(): { email: string; password: string } | null {
    const email = process.env.SERENATAS_E2E_EMAIL?.trim() || process.env.E2E_TEST_EMAIL?.trim();
    const password = process.env.SERENATAS_E2E_PASSWORD?.trim() || process.env.E2E_TEST_PASSWORD?.trim();
    if (!email || !password) return null;
    return { email, password };
}

export function e2eApiBase(): string {
    return (process.env.E2E_API_URL ?? process.env.API_INTERNAL_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

export function e2eAppOrigin(): string {
    return (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_ORIGIN).replace(/\/$/, '');
}

function parseSetCookieHeader(setCookie: string, origin: string) {
    return String(setCookie)
        .split(/,(?=[^;]+?=)/)
        .map((chunk) => {
            const [pair] = chunk.split(';');
            const [name, ...rest] = pair.trim().split('=');
            const value = rest.join('=');
            if (!name || !value) return null;
            // Playwright: usar `url` O `path`, no ambos.
            return { name, value, url: origin };
        })
        .filter((cookie): cookie is { name: string; value: string; url: string } => cookie !== null);
}

/** Login vía API y cookies de sesión en el contexto del navegador (smoke autenticado). */
export async function loginSerenatasSession(page: Page, email: string, password: string): Promise<void> {
    const apiBase = e2eApiBase();
    const login = await page.request.post(`${apiBase}/api/auth/login`, {
        data: { email, password },
    });
    if (!login.ok()) {
        throw new Error(`E2E login failed: ${login.status()} ${await login.text()}`);
    }
    const setCookie = login.headers()['set-cookie'];
    if (!setCookie) return;

    const origin = e2eAppOrigin();
    await page.context().addCookies(parseSetCookieHeader(setCookie, origin));
    await page.goto(origin);
    await page.evaluate((key) => {
        window.localStorage.setItem(key, 'work');
    }, APP_MODE_STORAGE_KEY);
}

export async function loginSerenatasRequest(
    request: APIRequestContext,
    email: string,
    password: string,
): Promise<void> {
    const response = await request.post(`${e2eApiBase()}/api/auth/login`, {
        data: { email, password },
    });
    if (!response.ok()) {
        throw new Error(`E2E login failed: ${response.status()} ${await response.text()}`);
    }
}

export async function addSessionCookiesFromLogin(
    context: BrowserContext,
    email: string,
    password: string,
): Promise<void> {
    const apiBase = e2eApiBase();
    const login = await context.request.post(`${apiBase}/api/auth/login`, {
        data: { email, password },
    });
    if (!login.ok()) {
        throw new Error(`E2E login failed: ${login.status()} ${await login.text()}`);
    }
    const setCookie = login.headers()['set-cookie'];
    if (!setCookie) return;

    const origin = e2eAppOrigin();
    await context.addCookies(parseSetCookieHeader(setCookie, origin));
}
