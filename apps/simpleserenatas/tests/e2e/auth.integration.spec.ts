import { expect, test } from '@playwright/test';

test.describe('Auth integration (API real)', () => {
  test.skip(!process.env.E2E_INTEGRATION, 'Define E2E_INTEGRATION=1 para ejecutar pruebas contra API real.');

  test('login responde error real con credenciales inválidas', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder('tu@email.com').fill('no-existe@simple.test');
    await page.getByPlaceholder('••••••••').fill('Password123!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByText(/correo|contraseña|sesión/i)).toBeVisible();
  });

  test('recuperar permite enviar solicitud con API real', async ({ page }) => {
    await page.goto('/auth/recuperar');
    await page.getByPlaceholder('tu@email.com').fill('no-existe@simple.test');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(/enlace|solicitud|correo/i)).toBeVisible();
  });
});
