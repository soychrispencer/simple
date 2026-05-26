import { test, expect } from '@playwright/test';

test.describe('SimpleSerenatas panel smoke', () => {
    test('/panel redirige o muestra acceso restringido', async ({ page }) => {
        await page.goto('/panel');
        await expect(page).toHaveURL(/\/panel/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: /acceso restringido|mi panel/i }).first()).toBeVisible({
            timeout: 15_000,
        });
    });

    test('/mariachis carga catálogo público', async ({ page }) => {
        await page.goto('/mariachis');
        await expect(page).toHaveURL((url) => new URL(url).pathname === '/mariachis', { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: /mariachis en el marketplace/i })).toBeVisible({
            timeout: 15_000,
        });
    });

    test('/panel/cuenta muestra acceso o formulario de cuenta', async ({ page }) => {
        await page.goto('/panel/cuenta');
        await expect(page).toHaveURL(/\/panel\/cuenta/, { timeout: 10_000 });
        await expect(
            page.getByRole('heading', { name: /acceso restringido|mi cuenta/i }).first(),
        ).toBeVisible({ timeout: 15_000 });
    });
});
