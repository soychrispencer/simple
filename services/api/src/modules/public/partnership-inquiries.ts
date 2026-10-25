import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { rateLimit } from '../../lib/rate-limit.js';

const singleLine = (max: number) => z.string().trim().min(2).max(max).refine((value) => !/[\r\n\0]/.test(value));
export const partnershipInquirySchema = z.object({
    requestId: z.uuid(),
    name: singleLine(120),
    company: singleLine(160),
    email: z.email().max(254).transform((value) => value.toLowerCase()),
    operation: z.enum(['venta', 'arriendo', 'ambas']),
    consent: z.literal(true),
    website: z.string().max(200).default(''),
}).strict();

export type PartnershipInquiry = z.infer<typeof partnershipInquirySchema>;
export type PartnershipInquiryDeps = {
    save: (inquiry: PartnershipInquiry) => Promise<'created' | 'duplicate' | 'conflict'>;
    notify: (inquiry: PartnershipInquiry) => Promise<void>;
    allowLocalOrigins?: boolean;
};

function allowedOrigin(raw: string, allowLocal: boolean): boolean {
    try {
        const origin = new URL(raw);
        if (['https://simplepropiedades.app', 'https://www.simplepropiedades.app'].includes(origin.origin)) return true;
        return allowLocal && ['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1'].includes(origin.hostname);
    } catch { return false; }
}

export function createPartnershipInquiryRouter(deps: PartnershipInquiryDeps) {
    const app = new Hono();
    app.use('*', rateLimit({ name: 'partnership-inquiry', limit: 5, windowMs: 15 * 60_000 }));
    app.use('*', bodyLimit({ maxSize: 4096, onError: (c) => c.json({ ok: false, error: 'La solicitud es demasiado extensa.' }, 413) }));
    app.post('/', async (c) => {
        c.header('Cache-Control', 'no-store');
        const origin = c.req.header('origin');
        if (origin && !allowedOrigin(origin, deps.allowLocalOrigins === true)) return c.json({ ok: false, error: 'Origen de la solicitud no permitido.' }, 403);
        if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) return c.json({ ok: false, error: 'Formato de solicitud inválido.' }, 415);
        const raw = await c.req.json().catch(() => null);
        if (typeof raw?.website === 'string' && raw.website.trim()) return c.json({ ok: true }, 202);
        const parsed = partnershipInquirySchema.safeParse(raw);
        if (!parsed.success) return c.json({ ok: false, error: 'Revise nombre, empresa, correo y autorización de contacto.' }, 400);
        let saved: Awaited<ReturnType<PartnershipInquiryDeps['save']>>;
        try { saved = await deps.save(parsed.data); }
        catch { return c.json({ ok: false, error: 'No pudimos registrar la solicitud. Intente nuevamente o contáctenos por WhatsApp.' }, 503); }
        if (saved === 'conflict') return c.json({ ok: false, error: 'La solicitud cambió. Actualice los datos e intente nuevamente.' }, 409);
        // The durable record is the source of truth; notification failure must not lose a lead.
        if (saved === 'created') void deps.notify(parsed.data).catch(() => console.warn('[partnership-inquiry] notification failed', { requestId: parsed.data.requestId }));
        return c.json({ ok: true }, saved === 'created' ? 201 : 200);
    });
    return app;
}
