import { test, expect } from '@playwright/test';
import { e2eApiBase, e2eCredentials, loginSerenatasSession } from './helpers/auth';

const creds = e2eCredentials();

test.describe('SimpleSerenatas smoke', () => {
    test('home carga documento HTML', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    });

    test('metadata de marca SimpleSerenatas', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/SimpleSerenatas/i);
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toMatch(/mariachis|serenatas/i);
    });

    test('landing pública menciona grupos o marketplace', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/grupos|marketplace|mariachis/i).first()).toBeVisible();
    });

    test('GET marketplace availability (API, sin auth)', async ({ request }) => {
        const apiBase = e2eApiBase();
        const groupsRes = await request.get(`${apiBase}/api/serenatas/marketplace/groups`);
        if (!groupsRes.ok()) {
            test.skip(true, 'API marketplace no disponible');
            return;
        }
        const groupsJson = await groupsRes.json() as { items?: { slug: string; servicesPreview?: { id: string }[] }[] };
        const group = groupsJson.items?.[0];
        if (!group?.servicesPreview?.[0]?.id) {
            test.skip(true, 'Sin grupos activos en marketplace (ejecutar db:seed:serenatas-e2e)');
            return;
        }
        const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const availabilityRes = await request.get(
            `${apiBase}/api/serenatas/marketplace/groups/${encodeURIComponent(group.slug)}/availability?date=${date}&serviceId=${group.servicesPreview[0].id}`,
        );
        if (availabilityRes.status() === 404) {
            test.skip(true, 'Ruta availability no encontrada (reiniciar API tras actualizar marketplace)');
            return;
        }
        expect(availabilityRes.ok()).toBeTruthy();
        const json = await availabilityRes.json() as { ok?: boolean; slots?: string[] };
        expect(json.ok).toBe(true);
        expect(Array.isArray(json.slots)).toBe(true);
    });

    test('GET público listings con brand (API)', async ({ request }) => {
        const apiBase = e2eApiBase();
        const response = await request.get(
            `${apiBase}/api/public/listings?vertical=autos&brand=toyota&limit=1`,
        );
        expect(response.ok()).toBeTruthy();
        const json = await response.json() as { ok?: boolean; items?: unknown[] };
        expect(json.ok).toBe(true);
        expect(Array.isArray(json.items)).toBe(true);
    });

    test('deep link /panel/grupos sin sesión', async ({ page }) => {
        await page.goto('/panel/grupos');
        await expect(page).toHaveURL(/\/panel\/grupos/);
        await expect(page.getByRole('heading', { name: /acceso restringido/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    });

    test('compat ?section=grupos redirige a /panel/grupos', async ({ page }) => {
        await page.goto('/?section=grupos');
        await expect(page).toHaveURL(/\/panel\/grupos/, { timeout: 10_000 });
    });

    test('panel agenda sin sesión muestra acceso restringido', async ({ page }) => {
        await page.goto('/panel/agenda');
        await expect(page).toHaveURL(/\/panel\/agenda/);
        await expect(page.getByRole('heading', { name: /acceso restringido/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    });

    test('panel serenatas sin sesión muestra acceso restringido', async ({ page }) => {
        await page.goto('/panel/serenatas');
        await expect(page).toHaveURL(/\/panel\/serenatas/);
        await expect(page.getByRole('heading', { name: /acceso restringido/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    });

    test('legacy ?grupo= redirige a /panel/grupo/{slug}', async ({ page }) => {
        await page.goto('/panel/grupo?grupo=demo-mariachi');
        await expect(page).toHaveURL(/\/panel\/grupo\/demo-mariachi/, { timeout: 10_000 });
    });

    test('compat ?section=solicitar redirige a /panel/solicitar', async ({ page }) => {
        await page.goto('/?section=solicitar');
        await expect(page).toHaveURL(/\/panel\/solicitar/, { timeout: 10_000 });
    });

    test('panel solicitar sin sesión muestra acceso restringido', async ({ page }) => {
        await page.goto('/panel/solicitar');
        await expect(page).toHaveURL(/\/panel\/solicitar/);
        await expect(page.getByRole('heading', { name: /acceso restringido/i })).toBeVisible();
    });

    test('panel inicio sin sesión muestra acceso restringido', async ({ page }) => {
        await page.goto('/panel');
        await expect(page).toHaveURL(/\/panel/);
        await expect(page.getByRole('heading', { name: /acceso restringido/i })).toBeVisible();
    });

    test('panel home autenticado (requiere SERENATAS_E2E_EMAIL)', async ({ page }) => {
        test.skip(!creds, 'Definir SERENATAS_E2E_EMAIL y SERENATAS_E2E_PASSWORD en .env.local');

        await loginSerenatasSession(page, creds!.email, creds!.password);

        await page.goto('/panel');
        await expect(page).toHaveURL(/\/panel/);
        await expect(page.getByText(/agenda|grupos|serenatas|panel/i).first()).toBeVisible({ timeout: 15_000 });
    });

    test('panel admin solicitudes y mi-negocio (requiere SERENATAS_E2E_EMAIL)', async ({ page }) => {
        test.skip(!creds, 'Definir SERENATAS_E2E_EMAIL y SERENATAS_E2E_PASSWORD en .env.local');

        await loginSerenatasSession(page, creds!.email, creds!.password);

        await page.goto('/panel/solicitudes');
        await expect(page).toHaveURL(/\/panel\/solicitudes/);
        await expect(page.getByRole('heading', { name: /solicitudes/i }).first()).toBeVisible({ timeout: 15_000 });

        await page.goto('/panel/mi-negocio');
        await expect(page).toHaveURL(/\/panel\/mi-negocio/);
        await expect(page.getByText(/mi negocio|perfil comercial|mariachi/i).first()).toBeVisible({ timeout: 15_000 });
    });

    test('marketplace grupos autenticado (requiere SERENATAS_E2E_EMAIL)', async ({ page }) => {
        test.skip(!creds, 'Definir SERENATAS_E2E_EMAIL y SERENATAS_E2E_PASSWORD en .env.local');

        await loginSerenatasSession(page, creds!.email, creds!.password);

        await page.goto('/panel/grupos');
        await expect(page).toHaveURL(/\/panel\/grupos/);
        await expect(page.getByRole('heading', { name: /explora mariachis|grupos de mariachis/i }).first()).toBeVisible({
            timeout: 15_000,
        });
    });
});
