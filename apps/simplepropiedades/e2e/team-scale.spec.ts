import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = (process.env.E2E_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const APP_ORIGIN = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
const PASSWORD = process.env.SIMPLE_ROLES_E2E_PASSWORD ?? 'simple-roles-local-e2e-only';
const OWNER_EMAIL = 'simplepropiedades-owner@simple-e2e.local';

function cookiesFromResponse(setCookie: string, origin: string) {
    return String(setCookie)
        .split(/,(?=[^;]+?=)/)
        .map((chunk) => {
            const [pair] = chunk.split(';');
            const [name, ...rest] = pair.trim().split('=');
            const value = rest.join('=');
            return name && value ? { name, value, url: origin } : null;
        })
        .filter((cookie): cookie is { name: string; value: string; url: string } => cookie !== null);
}

async function login(page: Page, context: BrowserContext) {
    const response = await page.request.post(`${API_BASE}/api/auth/login`, {
        data: { email: OWNER_EMAIL, password: PASSWORD },
    });
    expect(response.ok(), `Login local para ${OWNER_EMAIL} respondió ${response.status()}`).toBe(true);
    const setCookie = response.headers()['set-cookie'];
    expect(setCookie, 'La sesión local debe emitir cookie').toBeTruthy();
    await context.addCookies(cookiesFromResponse(setCookie!, APP_ORIGIN));
}

test('el equipo pagina más de 50 personas e invitaciones y conserva controles del dueño', async ({ page, context }) => {
    await login(page, context);
    await page.goto(`${APP_ORIGIN}/panel/equipo`);

    await expect(page.getByRole('heading', { name: 'Equipo', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Personas del equipo' })).toBeVisible();
    await expect(page.getByText('Mostrando 50 de 54 personas.')).toBeVisible();
    await expect(page.getByText('· Tú', { exact: true })).toHaveCount(0);
    await expect(page.getByText('simplepropiedades-scale-member-051@simple-e2e.local', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Permiso en el equipo').locator('option[value="admin"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Mostrar más personas' }).click();
    await expect(page.getByText('· Tú', { exact: true })).toBeVisible();
    await expect(page.getByText('simplepropiedades-scale-member-051@simple-e2e.local', { exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Invitaciones pendientes' })).toBeVisible();
    await expect(page.getByText('Mostrando 50 de 51 invitaciones.')).toBeVisible();
    await expect(page.getByText('simplepropiedades-scale-invite-001@simple-e2e.local', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click();
    await expect(page.getByText('simplepropiedades-scale-invite-001@simple-e2e.local', { exact: true })).toBeVisible();
});
