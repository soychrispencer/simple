import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.resolve(scriptDir, '../.env'), path.resolve(scriptDir, '../.env.local')]) {
    try {
        if (!existsSync(candidate)) continue;
        for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) continue;
            const key = trimmed.slice(0, separatorIndex).trim();
            if (!key || process.env[key]) continue;
            process.env[key] = trimmed.slice(separatorIndex + 1).trim();
        }
    } catch {
        // Ignore local env read errors and rely on explicit process env vars.
    }
}

const API_BASE = process.env.CRM_DEMO_API_URL ?? 'http://localhost:4000';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada.');
}

const ADMIN_EMAIL = 'admin@simpleplataforma.app';
const ADMIN_PASSWORD = 'Pik@0819';
const BUYER_EMAIL = 'test@example.com';
const BUYER_PASSWORD = 'DemoLead123!';
const SAMPLE_HREF = '/propiedad/demo-crm-departamento-las-condes';
const SAMPLE_TITLE = 'Departamento demo CRM en Las Condes';
const SAMPLE_LEAD_EMAILS = [
    'crm.interno@simpleplataforma.app',
    'crm.instagram@simpleplataforma.app',
    'crm.portal@simpleplataforma.app',
] as const;
const SAMPLE_EXTERNAL_IDS = [
    'ig-demo-001',
    'portal-demo-001',
] as const;

type ListingListItem = {
    id: string;
    href?: string | null;
    status?: string | null;
    vertical?: string | null;
    title?: string | null;
};

type ListingLeadItem = {
    id: string;
    source: string;
    channel: string;
    sourceLabel: string;
    contactName: string;
    createdAgo: string;
};

class CookieJar {
    private readonly values = new Map<string, string>();

    absorb(response: Response) {
        const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
        const setCookieHeaders = typeof getSetCookie === 'function' ? getSetCookie.call(response.headers) : [];
        for (const header of setCookieHeaders) {
            const [pair] = header.split(';', 1);
            const separatorIndex = pair.indexOf('=');
            if (separatorIndex <= 0) continue;
            const name = pair.slice(0, separatorIndex).trim();
            const value = pair.slice(separatorIndex + 1).trim();
            if (!name) continue;
            this.values.set(name, value);
        }
    }

    toHeaderValue() {
        return Array.from(this.values.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }
}

type ApiRequestInit = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    headers?: Record<string, string>;
};

async function apiRequest<T>(jar: CookieJar, pathName: string, init: ApiRequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    const cookieHeader = jar.toHeaderValue();
    if (cookieHeader) {
        headers.set('Cookie', cookieHeader);
    }

    let body: BodyInit | undefined;
    if (init.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(init.body);
    }

    const response = await fetch(`${API_BASE}${pathName}`, {
        method: init.method ?? 'GET',
        headers,
        body,
        redirect: 'manual',
    });
    jar.absorb(response);

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
        const message = data && typeof data.error === 'string'
            ? data.error
            : `${response.status} ${response.statusText}`;
        throw new Error(`${pathName}: ${message}`);
    }
    return data as T;
}

async function login(jar: CookieJar, email: string, password: string) {
    await apiRequest(jar, '/api/auth/login', {
        method: 'POST',
        body: { email, password },
    });
}

async function ensureSampleListing(adminJar: CookieJar) {
    const response = await apiRequest<{ items?: ListingListItem[] }>(adminJar, '/api/listings');
    const existing = response.items?.find((item) => item.href === SAMPLE_HREF) ?? null;

    if (existing) {
        if (existing.status !== 'active') {
            await apiRequest(adminJar, `/api/listings/${encodeURIComponent(existing.id)}/status`, {
                method: 'PATCH',
                body: { status: 'active' },
            });
        }
        return existing.id;
    }

    const created = await apiRequest<{ item?: ListingListItem }>(adminJar, '/api/listings', {
        method: 'POST',
        body: {
            vertical: 'propiedades',
            listingType: 'sale',
            title: SAMPLE_TITLE,
            description: 'Publicación demo para revisar el CRM y la trazabilidad de leads por canal.',
            priceLabel: 'UF 6.950',
            location: 'Las Condes, RM',
            href: SAMPLE_HREF,
            status: 'active',
            rawData: {
                propertyType: 'Departamento',
                bedrooms: 2,
                bathrooms: 2,
                usableArea: 78,
            },
        },
    });

    if (!created.item?.id) {
        throw new Error('No pudimos crear la publicación demo del CRM.');
    }
    return created.item.id;
}

async function removePreviousSampleLeads(sql: postgres.Sql, listingId: string) {
    const rows = await sql<{ id: string }[]>`
        select id
        from listing_leads
        where listing_id = ${listingId}
          and (
            contact_email = ${SAMPLE_LEAD_EMAILS[0]}
            or contact_email = ${SAMPLE_LEAD_EMAILS[1]}
            or contact_email = ${SAMPLE_LEAD_EMAILS[2]}
            or external_source_id = ${SAMPLE_EXTERNAL_IDS[0]}
            or external_source_id = ${SAMPLE_EXTERNAL_IDS[1]}
          )
    `;

    for (const row of rows) {
        await sql`
            delete from message_entries
            where thread_id in (
                select id from message_threads where lead_id = ${row.id}
            )
        `;
        await sql`delete from message_threads where lead_id = ${row.id}`;
        await sql`delete from listing_lead_activities where lead_id = ${row.id}`;
        await sql`delete from listing_leads where id = ${row.id}`;
    }
}

async function ensureBuyerPassword(sql: postgres.Sql) {
    const buyerRows = await sql<{ id: string }[]>`
        select id
        from users
        where email = ${BUYER_EMAIL}
        limit 1
    `;
    if (buyerRows.length === 0) {
        throw new Error(`No existe el usuario comprador ${BUYER_EMAIL} en la base local.`);
    }

    const hash = await bcrypt.hash(BUYER_PASSWORD, 10);
    await sql`
        update users
        set password_hash = ${hash},
            provider = 'local',
            status = 'active',
            updated_at = now()
        where id = ${buyerRows[0].id}
    `;
}

async function fetchAdminId(sql: postgres.Sql) {
    const rows = await sql<{ id: string }[]>`
        select id
        from users
        where email = ${ADMIN_EMAIL}
        limit 1
    `;
    if (rows.length === 0) {
        throw new Error(`No existe el administrador ${ADMIN_EMAIL} en la base local.`);
    }
    return rows[0].id;
}

async function createInternalLead(adminJar: CookieJar, buyerJar: CookieJar, adminId: string, listingId: string) {
    const created = await apiRequest<{ item?: { id: string } }>(buyerJar, '/api/listing-leads', {
        method: 'POST',
        body: {
            vertical: 'propiedades',
            listingId,
            contactName: 'Carolina Munoz',
            contactEmail: SAMPLE_LEAD_EMAILS[0],
            contactPhone: '+56911112222',
            contactWhatsapp: '+56911112222',
            message: 'Hola, me interesa visitar este departamento y revisar si aceptan crédito hipotecario.',
            sourcePage: SAMPLE_HREF,
            createThread: true,
            acceptedTerms: true,
        },
    });

    if (!created.item?.id) {
        throw new Error('No pudimos crear el lead interno de ejemplo.');
    }

    await apiRequest(adminJar, `/api/admin/listing-leads/${encodeURIComponent(created.item.id)}`, {
        method: 'PATCH',
        body: {
            priority: 'high',
            tags: ['interno', 'visita'],
            assignedToUserId: adminId,
            nextTaskTitle: 'Llamar y coordinar visita',
            nextTaskAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        },
    });
    await apiRequest(adminJar, `/api/admin/listing-leads/${encodeURIComponent(created.item.id)}/notes`, {
        method: 'POST',
        body: {
            body: 'Lead demo creado desde mensaje directo dentro de la plataforma.',
        },
    });

    return created.item.id;
}

async function insertImportedLeadExamples(sql: postgres.Sql, input: {
    listingId: string;
    adminId: string;
}) {
    const now = Date.now();
    const socialCreatedAt = new Date(now - 32 * 60 * 60 * 1000);
    const socialLastActivityAt = new Date(now - 30 * 60 * 60 * 1000);
    const portalCreatedAt = new Date(now - 100 * 60 * 60 * 1000);
    const portalQualifiedAt = new Date(now - 76 * 60 * 60 * 1000);

    const socialRows = await sql<{ id: string }[]>`
        insert into listing_leads (
            listing_id,
            owner_user_id,
            buyer_user_id,
            vertical,
            source,
            channel,
            contact_name,
            contact_email,
            contact_phone,
            contact_whatsapp,
            message,
            status,
            priority,
            close_reason,
            tags,
            assigned_to_user_id,
            next_task_title,
            next_task_at,
            source_page,
            external_source_id,
            last_activity_at,
            created_at,
            updated_at
        )
        values (
            ${input.listingId},
            ${input.adminId},
            null,
            'propiedades',
            'instagram',
            'social',
            'Fernanda Soto',
            ${SAMPLE_LEAD_EMAILS[1]},
            '+56923334444',
            '+56923334444',
            'Escribió desde Instagram preguntando por el metraje y los gastos comunes.',
            'contacted',
            'medium',
            null,
            ${JSON.stringify(['redes', 'instagram'])}::jsonb,
            ${input.adminId},
            'Responder por DM y compartir brochure',
            ${new Date(now + 18 * 60 * 60 * 1000)},
            'https://instagram.com/simplepropiedades/p/demo-crm',
            ${SAMPLE_EXTERNAL_IDS[0]},
            ${socialLastActivityAt},
            ${socialCreatedAt},
            ${socialLastActivityAt}
        )
        returning id
    `;
    const socialLeadId = socialRows[0]?.id;
    if (!socialLeadId) {
        throw new Error('No pudimos insertar el lead social de ejemplo.');
    }

    await sql`
        insert into listing_lead_activities (lead_id, actor_user_id, type, body, meta, created_at)
        values
        (
            ${socialLeadId},
            null,
            'created',
            'Lead importado desde Instagram.',
            ${JSON.stringify({ source: 'instagram', channel: 'social' })}::jsonb,
            ${socialCreatedAt}
        ),
        (
            ${socialLeadId},
            ${input.adminId},
            'note',
            'Pidió brochure y detalle de gastos comunes por mensaje directo.',
            ${JSON.stringify({ source: 'instagram', stage: 'follow_up' })}::jsonb,
            ${socialLastActivityAt}
        )
    `;

    const portalRows = await sql<{ id: string }[]>`
        insert into listing_leads (
            listing_id,
            owner_user_id,
            buyer_user_id,
            vertical,
            source,
            channel,
            contact_name,
            contact_email,
            contact_phone,
            contact_whatsapp,
            message,
            status,
            priority,
            close_reason,
            tags,
            assigned_to_user_id,
            next_task_title,
            next_task_at,
            source_page,
            external_source_id,
            last_activity_at,
            created_at,
            updated_at
        )
        values (
            ${input.listingId},
            ${input.adminId},
            null,
            'propiedades',
            'mercadolibre',
            'portal',
            'Inversiones Andes SpA',
            ${SAMPLE_LEAD_EMAILS[2]},
            '+56935556666',
            '+56935556666',
            'Consulta desde Portal Inmobiliario por rentabilidad, vacancia y disponibilidad inmediata.',
            'qualified',
            'high',
            null,
            ${JSON.stringify(['portal', 'inversionista'])}::jsonb,
            ${input.adminId},
            'Llamar y enviar ficha de rentabilidad',
            ${new Date(now - 4 * 60 * 60 * 1000)},
            'https://www.portalinmobiliario.com/demo-crm-departamento-las-condes',
            ${SAMPLE_EXTERNAL_IDS[1]},
            ${portalQualifiedAt},
            ${portalCreatedAt},
            ${portalQualifiedAt}
        )
        returning id
    `;
    const portalLeadId = portalRows[0]?.id;
    if (!portalLeadId) {
        throw new Error('No pudimos insertar el lead de portal de ejemplo.');
    }

    await sql`
        insert into listing_lead_activities (lead_id, actor_user_id, type, body, meta, created_at)
        values
        (
            ${portalLeadId},
            null,
            'created',
            'Lead importado desde Portal Inmobiliario.',
            ${JSON.stringify({ source: 'mercadolibre', channel: 'portal' })}::jsonb,
            ${portalCreatedAt}
        ),
        (
            ${portalLeadId},
            ${input.adminId},
            'status',
            'Estado cambiado de Nuevo a Calificado.',
            ${JSON.stringify({ from: 'new', to: 'qualified' })}::jsonb,
            ${portalQualifiedAt}
        ),
        (
            ${portalLeadId},
            ${input.adminId},
            'note',
            'Solicitó ficha de rentabilidad y quedó pendiente llamada de seguimiento.',
            ${JSON.stringify({ source: 'mercadolibre', stage: 'qualified' })}::jsonb,
            ${portalQualifiedAt}
        )
    `;

    return { socialLeadId, portalLeadId };
}

async function main() {
    const sql = postgres(DATABASE_URL, { max: 1 });
    try {
        const health = await fetch(`${API_BASE}/health`);
        if (!health.ok) {
            throw new Error(`La API local no está disponible en ${API_BASE}.`);
        }

        const adminId = await fetchAdminId(sql);
        await ensureBuyerPassword(sql);

        const adminJar = new CookieJar();
        const buyerJar = new CookieJar();
        await login(adminJar, ADMIN_EMAIL, ADMIN_PASSWORD);
        await login(buyerJar, BUYER_EMAIL, BUYER_PASSWORD);

        const listingId = await ensureSampleListing(adminJar);
        await removePreviousSampleLeads(sql, listingId);
        const internalLeadId = await createInternalLead(adminJar, buyerJar, adminId, listingId);
        const importedLeadIds = await insertImportedLeadExamples(sql, { listingId, adminId });

        const result = await apiRequest<{ items?: ListingLeadItem[] }>(adminJar, '/api/admin/listing-leads?vertical=propiedades');
        const sampleLeadIds = new Set([internalLeadId, importedLeadIds.socialLeadId, importedLeadIds.portalLeadId]);
        const sampleItems = (result.items ?? []).filter((item) => sampleLeadIds.has(item.id));

        console.log('CRM demo seeded successfully.');
        console.log(`Listing demo: ${SAMPLE_HREF}`);
        console.log(`Lead interno: ${internalLeadId}`);
        console.log(`Lead redes: ${importedLeadIds.socialLeadId}`);
        console.log(`Lead portal: ${importedLeadIds.portalLeadId}`);
        if (sampleItems.length > 0) {
            console.log(JSON.stringify(sampleItems, null, 2));
        }
    } finally {
        await sql.end({ timeout: 5 });
    }
}

void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
