import { test, expect } from '@playwright/test';
import { e2eApiBase, e2eCredentials, loginSerenatasSession } from './helpers/auth';

const creds = e2eCredentials();
const apiBase = e2eApiBase();

test.describe('SimpleSerenatas perfiles que conviven', () => {
    test('un acceso conserva perfiles, facturación y contexto de músico y proveedor', async ({ page }) => {
        test.skip(!creds, 'Sembrar la fixture dual local y definir SERENATAS_E2E_EMAIL y SERENATAS_E2E_PASSWORD.');
        await loginSerenatasSession(page, creds!.email, creds!.password);

        const profilesResponse = await page.request.get(`${apiBase}/api/serenatas/profiles`);
        expect(profilesResponse.ok()).toBeTruthy();
        const profilePayload = await profilesResponse.json() as {
            profiles?: {
                owner?: { commissionRateBps?: number } | null;
                musician?: { commissionRateBps?: number } | null;
            };
        };
        expect(profilePayload.profiles?.owner?.commissionRateBps).toBe(700);
        expect(profilePayload.profiles?.musician?.commissionRateBps).toBe(300);

        const providerPlanResponse = await page.request.get(`${apiBase}/api/serenatas/me/plan?billingProfileType=provider`);
        const musicianPlanResponse = await page.request.get(`${apiBase}/api/serenatas/me/plan?billingProfileType=musician`);
        expect(providerPlanResponse.ok()).toBeTruthy();
        expect(musicianPlanResponse.ok()).toBeTruthy();
        const providerPlan = await providerPlanResponse.json() as { billingProfileType?: string; plan?: string };
        const musicianPlan = await musicianPlanResponse.json() as { billingProfileType?: string; plan?: string };
        expect(providerPlan).toMatchObject({ billingProfileType: 'provider', plan: 'pro' });
        expect(musicianPlan).toMatchObject({ billingProfileType: 'musician', plan: 'free' });

        await page.goto('/panel');
        const roleSwitcher = page.getByLabel('Cambiar perfil activo');
        await expect(roleSwitcher).toBeVisible({ timeout: 15_000 });
        await expect(roleSwitcher.locator('option[value="owner"]')).toHaveText('Proveedor');
        await expect(roleSwitcher.locator('option[value="musician"]')).toHaveText('Músico');

        await roleSwitcher.selectOption('musician');
        await expect(roleSwitcher).toHaveValue('musician');
        await page.reload();
        await expect(roleSwitcher).toHaveValue('musician');
        await page.goto('/panel/mi-cuenta?account_tab=subscription');
        await expect(page.getByText(/Este plan pertenece a tu perfil de músico/i)).toBeVisible({ timeout: 15_000 });

        await page.getByLabel('Cambiar perfil activo').selectOption('owner');
        await expect(page.getByLabel('Cambiar perfil activo')).toHaveValue('owner');
        await page.goto('/panel/mi-cuenta?account_tab=subscription');
        await expect(page.getByText(/Este plan pertenece a tu perfil de proveedor/i)).toBeVisible({ timeout: 15_000 });
    });
});
