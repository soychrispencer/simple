import { expect, test, type Page } from '@playwright/test';

async function mockInitialAuthState(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'No autenticado' }),
    });
  });
}

test.describe('Auth flow', () => {
  test('login muestra error del API', async ({ page }) => {
    await mockInitialAuthState(page);
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Tu correo o contraseña no coinciden.' }),
      });
    });

    await page.goto('/auth/login');
    await page.getByPlaceholder('tu@email.com').fill('demo@simple.cl');
    await page.getByPlaceholder('••••••••').fill('12345678');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByText('Tu correo o contraseña no coinciden.')).toBeVisible();
  });

  test('login normaliza email antes de enviar', async ({ page }) => {
    await mockInitialAuthState(page);
    let sentEmail = '';
    await page.route('**/api/auth/login', async (route) => {
      const body = route.request().postDataJSON() as { email?: string };
      sentEmail = body.email ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: { id: 'u1', name: 'Demo', email: sentEmail, role: 'user', status: 'verified' },
        }),
      });
    });

    await page.goto('/auth/login');
    await page.getByPlaceholder('tu@email.com').fill('  DEMO@Simple.CL ');
    await page.getByPlaceholder('••••••••').fill('Password123!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect.poll(() => sentEmail).toBe('demo@simple.cl');
  });

  test('registro avanza por pasos y muestra fuerza de contraseña', async ({ page }) => {
    await mockInitialAuthState(page);

    await page.goto('/auth/registro');
    await expect(page.getByText('Paso 1 de 3')).toBeVisible();

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Paso 2 de 3')).toBeVisible();

    await page.getByPlaceholder('María González').fill('María Test');
    await page.getByPlaceholder('tu@email.com').fill('maria@test.cl');
    await page.getByPlaceholder('Mínimo 8 caracteres').fill('Password123!');
    await page.getByPlaceholder('+56 9 1234 5678').fill('+56912345678');
    await expect(page.getByText('Seguridad:')).toBeVisible();

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Paso 3 de 3')).toBeVisible();
  });

  test('recuperar contraseña confirma envío', async ({ page }) => {
    await mockInitialAuthState(page);
    await page.route('**/api/auth/password-reset/request', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/auth/recuperar');
    await page.getByPlaceholder('tu@email.com').fill('user@test.cl');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByText('Si tu correo existe, te enviamos un enlace para restablecer tu contraseña.')).toBeVisible();
  });

  test('restablecer valida contraseñas antes de enviar', async ({ page }) => {
    await mockInitialAuthState(page);

    await page.goto('/auth/restablecer?token=fake-token');
    await page.getByPlaceholder('Mínimo 8 caracteres').fill('Password123!');
    await page.getByPlaceholder('Confirma tu contraseña').fill('OtroPassword123!');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();

    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
  });
});
