import { test, expect } from '@playwright/test';
import { e2eCredentials, loginSerenatasSession } from './helpers/auth';

const creds = e2eCredentials();
const PENDING_RECIPIENT = /Destinatario E2E/i;

test.describe('SimpleSerenatas dueño (E2E real)', () => {
    test.beforeEach(() => {
        test.skip(!creds, 'Definir SERENATAS_E2E_EMAIL y SERENATAS_E2E_PASSWORD (o E2E_TEST_*)');
    });

    test('login → solicitudes → aceptar pending → agenda', async ({ page }) => {
        await loginSerenatasSession(page, creds!.email, creds!.password);

        await page.goto('/panel/solicitudes');
        await expect(page).toHaveURL(/\/panel\/solicitudes/);
        await expect(page.getByRole('heading', { name: /solicitudes/i }).first()).toBeVisible({ timeout: 15_000 });

        const pendingRow = page.getByText(PENDING_RECIPIENT).first();
        const hasFixture = await pendingRow.isVisible().catch(() => false);
        if (!hasFixture) {
            test.skip(true, 'Sin solicitud seed (ejecutar db:seed:serenatas-e2e)');
            return;
        }

        await pendingRow.click();
        const acceptButton = page.getByRole('button', { name: /aceptar solicitud/i });
        if (await acceptButton.isVisible().catch(() => false)) {
            await acceptButton.click();
        }

        await expect(page.getByRole('button', { name: /conformar grupo/i })).toBeVisible({
            timeout: 15_000,
        });

        await page.goto('/panel/agenda');
        await expect(page).toHaveURL(/\/panel\/agenda/);
        await expect(page.getByRole('heading', { name: /agenda/i })).toBeVisible({ timeout: 15_000 });
    });

    test('solicitud aceptada: conformar grupo operativo (opcional)', async ({ page }) => {
        await loginSerenatasSession(page, creds!.email, creds!.password);
        await page.goto('/panel/solicitudes?filter=accepted_pending_group');
        await expect(page.getByRole('heading', { name: /solicitudes/i }).first()).toBeVisible({ timeout: 15_000 });

        const needsGroup = page.getByText(PENDING_RECIPIENT).first();
        if (!(await needsGroup.isVisible().catch(() => false))) {
            test.skip(true, 'Sin serenata accepted_pending_group del seed');
            return;
        }

        await needsGroup.click();
        const assignButton = page.getByRole('button', { name: /conformar grupo/i });
        if (!(await assignButton.isVisible().catch(() => false))) {
            test.skip(true, 'Serenata ya tiene grupo asignado');
            return;
        }
        await assignButton.click();
        await expect(page.getByRole('heading', { name: /conformar grupo/i })).toBeVisible({ timeout: 10_000 });

        const confirm = page.getByRole('button', { name: /confirmar grupo y agendar/i });
        await expect(confirm).toBeVisible();
        await confirm.click();

        await expect(page.getByText(/confirmada|asignado|scheduled/i).first()).toBeVisible({ timeout: 20_000 });
    });
});
