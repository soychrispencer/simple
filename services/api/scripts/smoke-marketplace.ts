/**
 * Smoke HTTP: marketplace público + health (+ grupos autenticados opcional).
 *
 * Uso:
 *   pnpm --filter=@simple/api run smoke:marketplace
 *   API_BASE_URL=https://api.example.com pnpm --filter=@simple/api run smoke:marketplace
 *
 * Cookie de sesión (opcional, rutas autenticadas):
 *   SMOKE_SESSION_COOKIE="simple_session=..." pnpm --filter=@simple/api run smoke:marketplace
 *
 * POST marketplace opcional (requiere cookie + seed):
 *   SMOKE_MARKETPLACE_POST=1 SMOKE_PROVIDER_GROUP_ID=... SMOKE_SERVICE_ID=... SMOKE_SESSION_COOKIE=...
 *
 * Requiere API en marcha (p. ej. pnpm run dev:api).
 *
 * Rutas cubiertas: health, marketplace groups + groups/:id/services (forma JSON), boost featured,
 * mortgage-rates + uf-value (público propiedades), GET público listings con ?brand=, CORS preflight OPTIONS en health.
 * Sin Playwright — no requiere browsers en CI.
 *
 * Listings públicos: `SMOKE_LISTING_BRAND` (default `toyota`). Respuesta vacía es OK sin seed autos;
 * con ítems se valida forma mínima (id, title).
 */
const baseUrl = (process.env.API_BASE_URL ?? process.env.SMOKE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const smokeListingBrand = (process.env.SMOKE_LISTING_BRAND ?? 'toyota').trim().toLowerCase() || 'toyota';

const publicPaths = [
    '/api/health',
    '/api/serenatas/marketplace/groups',
    '/api/boost/featured?vertical=autos&section=sale&limit=1',
    '/api/public/mortgage-rates',
    '/api/public/uf-value',
    `/api/public/listings?vertical=autos&brand=${encodeURIComponent(smokeListingBrand)}&limit=1`,
] as const;

type PublicListingsJson = { ok?: boolean; items?: Array<{ id?: string; title?: string }> };

type MarketplaceGroupsJson = { ok?: boolean; items?: Array<{ id?: string; name?: string }> };

/** Valida forma mínima de respuesta marketplace (items array). */
async function checkMarketplaceGroupsShape(url: string, response: Response): Promise<MarketplaceGroupsJson> {
    const json = await response.json().catch(() => null) as MarketplaceGroupsJson | null;
    if (!json?.ok || !Array.isArray(json.items)) {
        console.error(`[smoke-marketplace] FAIL forma inválida en ${url}`);
        process.exit(1);
    }
    for (const item of json.items.slice(0, 3)) {
        if (!item || typeof item !== 'object') {
            console.error(`[smoke-marketplace] FAIL item inválido en ${url}`);
            process.exit(1);
        }
        if (typeof item.id !== 'string' || typeof item.name !== 'string') {
            console.error(`[smoke-marketplace] FAIL item sin id/name en ${url}`);
            process.exit(1);
        }
    }
    console.info(`[smoke-marketplace] OK groups shape (${json.items.length} items) ${url}`);
    return json;
}

async function checkPublicListingsShape(url: string, response: Response): Promise<void> {
    const json = await response.json().catch(() => null) as PublicListingsJson | null;
    if (!json?.ok || !Array.isArray(json.items)) {
        console.error(`[smoke-marketplace] FAIL listings forma inválida en ${url}`);
        process.exit(1);
    }
    if (json.items.length === 0) {
        console.info(
            `[smoke-marketplace] OK listings vacío (brand=${smokeListingBrand}; seed autos opcional) ${url}`,
        );
        return;
    }
    for (const item of json.items.slice(0, 3)) {
        if (!item || typeof item !== 'object') {
            console.error(`[smoke-marketplace] FAIL listing item inválido en ${url}`);
            process.exit(1);
        }
        if (typeof item.id !== 'string' || typeof item.title !== 'string') {
            console.error(`[smoke-marketplace] FAIL listing sin id/title en ${url}`);
            process.exit(1);
        }
    }
    console.info(`[smoke-marketplace] OK listings shape (${json.items.length} items) ${url}`);
}

async function checkMarketplaceServicesShape(url: string, response: Response): Promise<void> {
    const json = await response.json().catch(() => null) as { ok?: boolean; items?: unknown } | null;
    if (!json?.ok || !Array.isArray(json.items)) {
        console.error(`[smoke-marketplace] FAIL services forma inválida en ${url}`);
        process.exit(1);
    }
    for (const item of json.items.slice(0, 3)) {
        if (!item || typeof item !== 'object') {
            console.error(`[smoke-marketplace] FAIL service item inválido en ${url}`);
            process.exit(1);
        }
        const row = item as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.providerGroupId !== 'string') {
            console.error(`[smoke-marketplace] FAIL service sin id/name/providerGroupId en ${url}`);
            process.exit(1);
        }
    }
    console.info(`[smoke-marketplace] OK services shape (${json.items.length} items) ${url}`);
}

async function fetchMarketplaceServicesForGroup(groupId: string): Promise<void> {
    const path = `/api/serenatas/marketplace/groups/${encodeURIComponent(groupId)}/services`;
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, { headers: buildHeaders() });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[smoke-marketplace] FAIL ${response.status} ${url}`);
        if (body) console.error(body.slice(0, 500));
        process.exit(1);
    }
    await checkMarketplaceServicesShape(url, response);
}

function resolveSmokeGroupId(groups: MarketplaceGroupsJson): string | null {
    const fromEnv = process.env.SMOKE_PROVIDER_GROUP_ID?.trim();
    if (fromEnv) return fromEnv;
    const first = groups.items?.find((item) => typeof item?.id === 'string');
    return first?.id ?? null;
}

async function checkHealthBody(): Promise<void> {
    const url = `${baseUrl}/api/health`;
    const response = await fetch(url, { headers: buildHeaders() });
    if (!response.ok) {
        console.error(`[smoke-marketplace] FAIL health GET ${response.status} ${url}`);
        process.exit(1);
    }
    const json = await response.json().catch(() => null) as { ok?: boolean } | null;
    if (!json?.ok) {
        console.error(`[smoke-marketplace] FAIL health body sin ok:true ${url}`);
        process.exit(1);
    }
    console.info(`[smoke-marketplace] OK health body ${url}`);
}

async function checkHealthCorsPreflight(): Promise<void> {
    const url = `${baseUrl}/api/health`;
    const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
            origin: 'http://localhost:3005',
            'access-control-request-method': 'GET',
        },
    });
    if (response.status !== 204 && response.status !== 200) {
        console.error(`[smoke-marketplace] FAIL OPTIONS ${response.status} ${url}`);
        process.exit(1);
    }
    console.info(`[smoke-marketplace] OK CORS preflight ${response.status} ${url}`);
}

const optionalAuthPaths = [
    '/api/serenatas/groups',
] as const;

function buildHeaders(): HeadersInit {
    const headers: Record<string, string> = { accept: 'application/json' };
    const cookie = process.env.SMOKE_SESSION_COOKIE?.trim();
    if (cookie) {
        headers.cookie = cookie.includes('=') ? cookie : `simple_session=${cookie}`;
    }
    return headers;
}

async function checkPath(path: string, opts?: { optional?: boolean }): Promise<void> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, { headers: buildHeaders() });
    if (!response.ok) {
        if (opts?.optional && (response.status === 401 || response.status === 403)) {
            console.info(`[smoke-marketplace] SKIP auth ${response.status} ${url}`);
            return;
        }
        const body = await response.text().catch(() => '');
        console.error(`[smoke-marketplace] FAIL ${response.status} ${url}`);
        if (body) console.error(body.slice(0, 500));
        process.exit(1);
    }
    const json = await response.json().catch(() => null);
    if (!json || typeof json !== 'object' || !('ok' in json)) {
        console.error(`[smoke-marketplace] FAIL respuesta JSON inesperada en ${url}`);
        process.exit(1);
    }
    console.info(`[smoke-marketplace] OK ${response.status} ${url}`);
}

async function main() {
    await checkHealthBody();
    await checkHealthCorsPreflight();

    let groupsJson: MarketplaceGroupsJson | null = null;

    for (const path of publicPaths) {
        if (path === '/api/serenatas/marketplace/groups') {
            const url = `${baseUrl}${path}`;
            const response = await fetch(url, { headers: buildHeaders() });
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`[smoke-marketplace] FAIL ${response.status} ${url}`);
                if (body) console.error(body.slice(0, 500));
                process.exit(1);
            }
            groupsJson = await checkMarketplaceGroupsShape(url, response);
            continue;
        }
        if (path.startsWith('/api/public/listings?')) {
            const url = `${baseUrl}${path}`;
            const response = await fetch(url, { headers: buildHeaders() });
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`[smoke-marketplace] FAIL ${response.status} ${url}`);
                if (body) console.error(body.slice(0, 500));
                process.exit(1);
            }
            await checkPublicListingsShape(url, response);
            continue;
        }
        await checkPath(path);
    }

    const groupId = groupsJson ? resolveSmokeGroupId(groupsJson) : null;
    if (groupId) {
        await fetchMarketplaceServicesForGroup(groupId);
        console.info(`[smoke-marketplace] OK services for groupId=${groupId}`);
    } else {
        console.info('[smoke-marketplace] SKIP services (sin grupos activos ni SMOKE_PROVIDER_GROUP_ID)');
    }

    for (const path of optionalAuthPaths) {
        await checkPath(path, { optional: !process.env.SMOKE_SESSION_COOKIE });
    }
    if (!process.env.SMOKE_SESSION_COOKIE) {
        console.info('[smoke-marketplace] Tip: export SMOKE_SESSION_COOKIE para probar /api/serenatas/groups');
    }
    if (!process.env.SMOKE_PROVIDER_GROUP_ID) {
        console.info('[smoke-marketplace] Tip: SMOKE_PROVIDER_GROUP_ID=<uuid> tras db:seed:marketplace para forzar un grupo concreto');
    }

    if (process.env.SMOKE_MARKETPLACE_POST === '1' && process.env.SMOKE_SESSION_COOKIE?.trim()) {
        const postGroupId = process.env.SMOKE_PROVIDER_GROUP_ID?.trim();
        const serviceId = process.env.SMOKE_SERVICE_ID?.trim();
        if (!postGroupId || !serviceId) {
            console.info('[smoke-marketplace] SKIP POST marketplace (falta SMOKE_PROVIDER_GROUP_ID o SMOKE_SERVICE_ID)');
        } else {
            const postUrl = `${baseUrl}/api/serenatas/client/serenatas`;
            const response = await fetch(postUrl, {
                method: 'POST',
                headers: { ...buildHeaders(), 'content-type': 'application/json' },
                body: JSON.stringify({
                    providerGroupId: postGroupId,
                    serviceId,
                    recipientName: 'Smoke Test',
                    clientPhone: '+56900000000',
                    eventDate: '2030-06-01',
                    eventTime: '20:00',
                    address: 'Av. Smoke 123',
                    comuna: 'Providencia',
                    region: 'Región Metropolitana',
                    message: 'smoke-marketplace optional POST',
                }),
            });
            if (response.status === 401 || response.status === 403) {
                console.info(`[smoke-marketplace] SKIP POST auth ${response.status}`);
            } else if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.error(`[smoke-marketplace] FAIL POST ${response.status} ${postUrl}`);
                if (body) console.error(body.slice(0, 500));
                process.exit(1);
            } else {
                console.info(`[smoke-marketplace] OK POST marketplace ${postUrl}`);
            }
        }
    }
}

main().catch((error) => {
    console.error('[smoke-marketplace] ERROR', error);
    process.exit(1);
});
