import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = (process.env.E2E_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const APP_ORIGIN = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
const AGENDA_ORIGIN = (process.env.PLAYWRIGHT_AGENDA_BASE_URL ?? 'http://localhost:3004').replace(/\/$/, '');
const PASSWORD = process.env.SIMPLE_ROLES_E2E_PASSWORD ?? 'simple-roles-local-e2e-only';
const TEST_USERS = {
    individual: 'simplepropiedades-individual@simple-e2e.local',
    independent: 'simplepropiedades-independent@simple-e2e.local',
    owner: 'simplepropiedades-owner@simple-e2e.local',
    admin: 'simplepropiedades-admin@simple-e2e.local',
    agent: 'simplepropiedades-agent@simple-e2e.local',
} as const;

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

async function login(page: Page, context: BrowserContext, email: string) {
    const response = await page.request.post(`${API_BASE}/api/auth/login`, {
        data: { email, password: PASSWORD },
    });
    expect(response.ok(), `Login local para ${email} respondió ${response.status()}`).toBe(true);
    const setCookie = response.headers()['set-cookie'];
    expect(setCookie, 'La sesión local debe emitir cookie').toBeTruthy();
    await context.addCookies(cookiesFromResponse(setCookie!, APP_ORIGIN));
    await page.goto(`${APP_ORIGIN}/panel`);
    await expect(page.getByRole('heading', { name: 'Mi panel' })).toBeVisible();
}

async function dismissPanelIntentForCurrentAccount(page: Page) {
    const response = await page.request.get(`${API_BASE}/api/accounts/current/workspace?vertical=propiedades`);
    expect(response.ok(), 'La API local debe devolver la actividad del espacio').toBe(true);
    const context = await response.json() as { workspace?: { accountId?: string; operatorSubtype?: string | null } };
    const accountId = context.workspace?.accountId;
    expect(accountId, 'La sesión debe tener un espacio activo').toBeTruthy();
    const activityKey = context.workspace?.operatorSubtype?.trim() || 'default';
    await page.evaluate((id) => {
        localStorage.setItem(`simplepropiedades-panel-intent-dismissed-v1:${id.accountId}`, '1');
        localStorage.setItem(`simplepropiedades-panel-intent-dismissed-v1:${id.accountId}:${id.activityKey}`, '1');
    }, { accountId: accountId!, activityKey });
    await page.reload();
}

test.describe('SimplePropiedades: panel local por segmento y rol', () => {
    test('particular ve herramientas enfocadas en sus propiedades', async ({ page, context }) => {
        await login(page, context, TEST_USERS.individual);
        await dismissPanelIntentForCurrentAccount(page);

        await expect(page.getByRole('heading', { name: 'Publica tus propiedades y atiende a cada interesado' })).toBeVisible();
        await expect(page.getByText(/Propietario/).first()).toBeVisible();
        await expect(page.getByRole('complementary').getByRole('link', { name: 'Mi negocio', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Equipo', exact: true })).toHaveCount(0);
    });

    test('corredor independiente ve su operación profesional', async ({ page, context }) => {
        await login(page, context, TEST_USERS.independent);
        await dismissPanelIntentForCurrentAccount(page);

        await expect(page.getByRole('heading', { name: 'Tu operación de corretaje, en un solo lugar' })).toBeVisible();
        await expect(page.getByText(/Corredor independiente/).first()).toBeVisible();
        await expect(page.getByRole('complementary').getByRole('link', { name: 'Mi negocio', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Equipo', exact: true })).toHaveCount(0);
    });

    test('dueño ve la operación y gestión de equipo de su inmobiliaria', async ({ page, context }) => {
        await login(page, context, TEST_USERS.owner);
        await dismissPanelIntentForCurrentAccount(page);

        await expect(page.getByRole('heading', { name: 'Coordina la operación de tu inmobiliaria' })).toBeVisible();
        await expect(page.getByRole('complementary').getByRole('link', { name: 'Mi negocio', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /Equipo/ })).toBeVisible();
        await expect(
            page.getByRole('combobox', { name: 'Espacio activo' }).locator('option:checked'),
        ).toContainText('Simple E2E Inmobiliaria');
    });

    test('una misma persona alterna entre su cuenta personal y el espacio de empresa', async ({ page, context }) => {
        await login(page, context, TEST_USERS.owner);

        const currentAccountResponse = await page.request.get(`${API_BASE}/api/accounts/current`);
        expect(currentAccountResponse.ok(), 'La API debe cargar los espacios del dueño').toBe(true);
        const currentAccount = await currentAccountResponse.json() as {
            memberships?: Array<{ accountId: string; isDefault: boolean; account?: { name?: string; isPersonal?: boolean } | null }>;
        };
        const membershipLabels = (currentAccount.memberships ?? []).map((membership) =>
            `${membership.account?.name ?? membership.accountId}${membership.isDefault ? ' · predeterminado' : ''}`,
        );

        const switcher = page.getByRole('combobox', { name: 'Espacio activo' });
        await expect(switcher).toBeVisible();
        const options = await switcher.locator('option').evaluateAll((elements) => elements.map((option) => ({
            id: (option as HTMLOptionElement).value,
            label: option.textContent?.trim() ?? '',
        })));
        const personal = options.find((option) => option.label.includes('Cuenta personal'));
        const company = options.find((option) => option.label.includes('Simple E2E Inmobiliaria'));
        expect(personal?.id, `El dueño conserva su espacio personal. Espacios recibidos: ${membershipLabels.join(' | ') || 'ninguno'}`).toBeTruthy();
        expect(company?.id, `El dueño tiene acceso al espacio de empresa. Espacios recibidos: ${membershipLabels.join(' | ') || 'ninguno'}`).toBeTruthy();

        try {
            await switcher.selectOption(personal!.id);
            await expect(switcher.locator('option:checked')).toContainText('Cuenta personal');
            await expect(page.getByRole('complementary').getByText('Cuenta personal')).toBeVisible();

            await switcher.selectOption(company!.id);
            await expect(switcher.locator('option:checked')).toContainText('Simple E2E Inmobiliaria');
        } finally {
            const activeResponse = await page.request.get(`${API_BASE}/api/accounts/current`);
            const activeContext = await activeResponse.json() as { account?: { id?: string } };
            if (activeContext.account?.id !== company!.id) {
                const restoreResponse = await page.request.post(`${API_BASE}/api/accounts/current/switch`, {
                    data: { accountId: company!.id },
                });
                expect(restoreResponse.ok(), 'El seed debe quedar en el espacio de empresa predeterminado').toBe(true);
            }
        }
    });

    test('administrador puede trabajar y abrir la gestión del equipo', async ({ page, context }) => {
        await login(page, context, TEST_USERS.admin);
        await dismissPanelIntentForCurrentAccount(page);

        await expect(page.getByRole('heading', { name: 'Coordina la operación de tu inmobiliaria' })).toBeVisible();
        await expect(page.getByRole('complementary').getByRole('link', { name: 'Mi negocio', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /Equipo/ })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Publicaciones', exact: true })).toBeVisible();
    });

    test('agente conserva su cartera y no ve controles de administración', async ({ page, context }) => {
        await login(page, context, TEST_USERS.agent);
        await dismissPanelIntentForCurrentAccount(page);

        await expect(page.getByRole('heading', { name: 'Tu cartera de trabajo' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Publicaciones', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Contactos', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Mensajes', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Mi negocio', exact: true })).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Finanzas', exact: true })).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Estadísticas', exact: true })).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Equipo', exact: true })).toHaveCount(0);

        await page.getByRole('button', { name: 'Panel de usuario' }).click();
        const accountNavigation = page.getByRole('navigation', { name: 'Navegación de panel' });
        await expect(accountNavigation.getByRole('link', { name: 'Mi panel', exact: true })).toBeVisible();
        await expect(accountNavigation.getByRole('link', { name: 'Publicaciones', exact: true })).toBeVisible();
        await expect(accountNavigation.getByRole('link', { name: 'Contactos', exact: true })).toBeVisible();
        await expect(accountNavigation.getByRole('link', { name: 'Mensajes', exact: true })).toBeVisible();
        await expect(accountNavigation.getByRole('link', { name: 'Mi cuenta', exact: true })).toBeVisible();
        await expect(accountNavigation.getByRole('link', { name: 'Publicidad', exact: true })).toHaveCount(0);
        await expect(accountNavigation.getByRole('link', { name: 'Finanzas', exact: true })).toHaveCount(0);
        await expect(accountNavigation.getByRole('link', { name: 'Estadísticas', exact: true })).toHaveCount(0);
        await expect(accountNavigation.getByRole('link', { name: 'Mi negocio', exact: true })).toHaveCount(0);

        await page.goto('http://localhost:3002/panel');
        await expect(page.getByRole('button', { name: 'Panel de usuario' })).toBeVisible();
        await page.getByRole('button', { name: 'Panel de usuario' }).click();
        const autosAccountNavigation = page.getByRole('navigation', { name: 'Navegación de panel' });
        await expect(autosAccountNavigation.getByRole('link', { name: 'Mi panel', exact: true })).toBeVisible();
        await expect(autosAccountNavigation.getByRole('link', { name: 'Mis publicaciones', exact: true })).toBeVisible();
        await expect(autosAccountNavigation.getByRole('link', { name: 'Contactos', exact: true })).toBeVisible();
        await expect(autosAccountNavigation.getByRole('link', { name: 'Mensajes', exact: true })).toBeVisible();
        await expect(autosAccountNavigation.getByRole('link', { name: 'Mi cuenta', exact: true })).toBeVisible();
        await expect(autosAccountNavigation.getByRole('link', { name: 'Publicidad', exact: true })).toHaveCount(0);
        await expect(autosAccountNavigation.getByRole('link', { name: 'Finanzas', exact: true })).toHaveCount(0);
        await expect(autosAccountNavigation.getByRole('link', { name: 'Estadísticas', exact: true })).toHaveCount(0);
        await expect(autosAccountNavigation.getByRole('link', { name: 'Mi negocio', exact: true })).toHaveCount(0);
    });

    test('dueño coordina visitas del equipo y puede asignar responsable en SimpleAgenda', async ({ page, context }) => {
        await login(page, context, TEST_USERS.owner);
        await page.goto(`${AGENDA_ORIGIN}/panel/visitas-equipo?nueva=1`);

        await expect(page.getByRole('heading', { name: 'Visitas del equipo' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Nueva visita o reunión' })).toBeVisible();
        await expect(page.getByLabel('Responsable', { exact: true })).toBeVisible();
    });

    test('agente ve sus visitas asignadas y no puede asignarlas a otra persona', async ({ page, context }) => {
        await login(page, context, TEST_USERS.agent);
        await page.goto(`${AGENDA_ORIGIN}/panel/visitas-equipo?nueva=1`);

        await expect(page.getByRole('heading', { name: 'Mis visitas' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Nueva visita o reunión' })).toBeVisible();
        await expect(page.getByLabel('Responsable', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible();
    });
});
