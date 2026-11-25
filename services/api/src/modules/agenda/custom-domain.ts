import dns from 'node:dns/promises';
import net from 'node:net';

export type CustomDomainStatus = 'none' | 'pending' | 'verified' | 'error';

const DEFAULT_AGENDA_APP_UUID = 'bgwg04c0csokg8cgs84s80s8';
const DEFAULT_TARGET_HOST = 'simpleagenda.app';
const HOSTNAME_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
let cachedTargetIp: { host: string; ip: string | null; expiresAt: number } | null = null;

export async function getCustomDomainTargetIp(
    targetHost: string = getCustomDomainTargetHost(),
): Promise<string | null> {
    const envIp = process.env.AGENDA_CUSTOM_DOMAIN_IP?.trim();
    if (envIp && net.isIPv4(envIp)) return envIp;

    const now = Date.now();
    if (cachedTargetIp && cachedTargetIp.host === targetHost && cachedTargetIp.expiresAt > now) {
        return cachedTargetIp.ip;
    }

    const ips = await dns.resolve4(targetHost).catch(() => [] as string[]);
    const ip = ips[0] ?? null;
    cachedTargetIp = { host: targetHost, ip, expiresAt: now + 10 * 60_000 };
    return ip;
}

export function getCustomDomainTargetHost(): string {
    const raw = process.env.AGENDA_CUSTOM_DOMAIN_TARGET || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_TARGET_HOST;
    return raw
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .trim()
        .toLowerCase() || DEFAULT_TARGET_HOST;
}

export function normalizeCustomDomain(
    raw: string,
): { ok: true; domain: string } | { ok: false; error: string } {
    const cleaned = raw
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.+$/, '');

    if (!cleaned) {
        return { ok: false, error: 'Ingresa un dominio válido (ej. reservas.tudominio.cl).' };
    }
    if (cleaned.length > 253) {
        return { ok: false, error: 'El dominio es demasiado largo.' };
    }
    if (net.isIP(cleaned) !== 0) {
        return { ok: false, error: 'Usa un nombre de dominio, no una dirección IP.' };
    }

    const targetHost = getCustomDomainTargetHost();
    if (
        cleaned === 'localhost'
        || cleaned.endsWith('.localhost')
        || cleaned === targetHost
        || cleaned.endsWith(`.${targetHost}`)
        || cleaned === 'simpleagenda.app'
        || cleaned.endsWith('.simpleagenda.app')
        || cleaned === 'simpleplataforma.app'
        || cleaned.endsWith('.simpleplataforma.app')
    ) {
        return { ok: false, error: 'No puedes usar un subdominio interno de SimpleAgenda.' };
    }

    const labels = cleaned.split('.');
    if (labels.length < 2 || labels.some((label) => !HOSTNAME_LABEL_RE.test(label))) {
        return { ok: false, error: 'Formato de dominio inválido. Ejemplo: reservas.tudominio.cl' };
    }

    const tld = labels[labels.length - 1] ?? '';
    if (tld.length < 2 || /^\d+$/.test(tld)) {
        return { ok: false, error: 'El dominio debe terminar en una extensión válida (ej. .cl, .com).' };
    }

    return { ok: true, domain: cleaned };
}

export async function verifyCustomDomainDns(
    domain: string,
    targetHost: string = getCustomDomainTargetHost(),
): Promise<{
    verified: boolean;
    method: 'cname' | 'a' | 'none';
    resolved: string[];
    error?: string;
}> {
    const normalizedTarget = targetHost.replace(/\.+$/, '').toLowerCase();

    try {
        const cnames = await dns.resolveCname(domain).catch(() => [] as string[]);
        const normalizedCnames = cnames.map((entry) => entry.replace(/\.+$/, '').toLowerCase());
        if (normalizedCnames.some((entry) => entry === normalizedTarget)) {
            return { verified: true, method: 'cname', resolved: normalizedCnames };
        }
    } catch {
        // Fallback to A record check below.
    }

    const [domainIps, targetIps] = await Promise.all([
        dns.resolve4(domain).catch(() => [] as string[]),
        dns.resolve4(normalizedTarget).catch(() => [] as string[]),
    ]);

    if (domainIps.length > 0 && targetIps.some((ip) => domainIps.includes(ip))) {
        return { verified: true, method: 'a', resolved: domainIps };
    }

    return {
        verified: false,
        method: 'none',
        resolved: domainIps,
        error: `Aún no detectamos que ${domain} apunte a ${normalizedTarget}. Configura un CNAME hacia ${normalizedTarget} y vuelve a verificar en unos minutos.`,
    };
}

export async function syncCustomDomainWithCoolify(input: {
    action: 'add' | 'remove';
    domain: string;
}): Promise<{ ok: boolean; synced: boolean; error?: string }> {
    const coolifyUrl = (process.env.COOLIFY_URL ?? '').replace(/\/$/, '');
    const coolifyToken = process.env.COOLIFY_API_TOKEN ?? '';
    const appUuid = process.env.COOLIFY_AGENDA_APP_UUID || DEFAULT_AGENDA_APP_UUID;

    if (!coolifyUrl || !coolifyToken) {
        return { ok: true, synced: false };
    }

    const headers = {
        Authorization: `Bearer ${coolifyToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };

    try {
        const currentRes = await fetch(`${coolifyUrl}/api/v1/applications/${appUuid}`, {
            method: 'GET',
            headers,
        });
        if (!currentRes.ok) {
            return {
                ok: false,
                synced: false,
                error: `No pudimos consultar el servidor de dominios (HTTP ${currentRes.status}).`,
            };
        }

        const currentApp = await currentRes.json() as { fqdn?: string | null };
        const existingDomains = String(currentApp.fqdn ?? '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);

        const targetEntry = `https://${input.domain}`;
        const primaryHost = `https://${getCustomDomainTargetHost()}`;

        const nextSet = new Set(existingDomains);
        if (!nextSet.has(primaryHost)) {
            nextSet.add(primaryHost);
        }

        if (input.action === 'add') {
            nextSet.add(targetEntry);
        } else {
            nextSet.delete(targetEntry);
            nextSet.delete(`http://${input.domain}`);
        }

        const nextFqdn = [...nextSet].join(',');
        const patchRes = await fetch(`${coolifyUrl}/api/v1/applications/${appUuid}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ domains: nextFqdn }),
        });

        if (!patchRes.ok) {
            return {
                ok: false,
                synced: false,
                error: `No pudimos registrar el certificado SSL en Coolify (HTTP ${patchRes.status}).`,
            };
        }

        return { ok: true, synced: true };
    } catch (error) {
        console.error('[agenda] Coolify domain sync error:', error);
        return {
            ok: false,
            synced: false,
            error: 'Error de conexión al sincronizar el dominio con el servidor.',
        };
    }
}
