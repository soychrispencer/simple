import { NextResponse } from 'next/server';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { logError } from '@/lib/logger';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

const LeadSchema = z.object({
  company: z.string().optional().default(''),
  captchaToken: z.string().trim().min(1).max(5000).optional(),
  listingId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(6).max(40),
  city: z.string().trim().min(2).max(80).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  vehicleType: z.enum(['auto', 'moto', 'camioneta', 'camion', 'otro']).optional(),
  brand: z.string().trim().max(60).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  model: z.string().trim().max(60).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  year: z.coerce.number().int().min(1970).max(new Date().getFullYear() + 1).optional(),
  mileageKm: z.coerce.number().int().min(0).max(2_000_000).optional(),
  desiredPrice: z.coerce.number().min(0).max(10_000_000_000).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  consent: z.boolean(),
});

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

function makeReferenceCode() {
  const uuid = (globalThis as any).crypto?.randomUUID?.() as string | undefined;
  const raw = uuid ? uuid.replace(/-/g, '').slice(0, 10) : Math.random().toString(16).slice(2, 12);
  return `SA-${raw.toUpperCase()}`;
}

function makeTrackingToken() {
  const cryptoAny = (globalThis as any).crypto;
  const a = (cryptoAny?.randomUUID?.() as string | undefined) || Math.random().toString(16).slice(2);
  const b = (cryptoAny?.randomUUID?.() as string | undefined) || Math.random().toString(16).slice(2);
  return `sat_${String(a).replace(/-/g, '')}${String(b).replace(/-/g, '')}`;
}

async function maybeNotifyLeadEmail(payload: {
  referenceCode: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  city: string | null;
  listingId: string | null;
  createdAtIso: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const to = process.env.LEADS_NOTIFY_TO;

  if (!host || !port || !user || !pass || !from || !to) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const subject = `Nuevo lead Venta Asistida · ${payload.referenceCode}`;
  const text = [
    `Referencia: ${payload.referenceCode}`,
    `Fecha: ${payload.createdAtIso}`,
    `Nombre: ${payload.ownerName || '-'}`,
    `Teléfono: ${payload.ownerPhone || '-'}`,
    `Email: ${payload.ownerEmail || '-'}`,
    `Ciudad: ${payload.city || '-'}`,
    `ListingId: ${payload.listingId || '-'}`,
    '',
    `Panel: /panel/admin/venta-asistida`,
  ].join('\n');

  await transporter.sendMail({ from, to, subject, text });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    if (input.company && input.company.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!input.consent) {
      return NextResponse.json({ error: 'Debes aceptar la política/consentimiento.' }, { status: 400 });
    }

    const auth = requireAuthUserId(request);
    const authUserId = 'error' in auth ? null : auth.userId;
    const db = getDbPool();
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;

    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
    if (hcaptchaSecret) {
      if (!input.captchaToken) {
        return NextResponse.json({ error: 'Captcha requerido.' }, { status: 400 });
      }
      const verifyBody = new URLSearchParams();
      verifyBody.set('secret', hcaptchaSecret);
      verifyBody.set('response', input.captchaToken);
      if (ip) verifyBody.set('remoteip', String(ip));

      const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: verifyBody.toString(),
      });
      const verifyJson = (await verifyRes.json().catch(() => null)) as any;
      if (!verifyJson?.success) {
        return NextResponse.json({ error: 'Captcha inválido.' }, { status: 400 });
      }
    }

    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [hourCountRes, dayCountRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS count
           FROM vehicle_sale_service_requests
           WHERE ip = $1 AND created_at >= $2`,
          [ip, oneHourAgo]
        ),
        db.query(
          `SELECT COUNT(*)::int AS count
           FROM vehicle_sale_service_requests
           WHERE ip = $1 AND created_at >= $2`,
          [ip, oneDayAgo]
        ),
      ]);

      const hourCount = Number(hourCountRes.rows[0]?.count || 0);
      const dayCount = Number(dayCountRes.rows[0]?.count || 0);
      const maxPerHour = Number(process.env.VENTA_ASISTIDA_MAX_PER_HOUR || 3);
      const maxPerDay = Number(process.env.VENTA_ASISTIDA_MAX_PER_DAY || 10);
      if (hourCount >= maxPerHour || dayCount >= maxPerDay) {
        return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
      }
    }

    let listingIdToSave: string | null = null;
    if (input.listingId && authUserId) {
      const listingRow = await db.query(
        `SELECT id, user_id
         FROM listings
         WHERE id = $1
         LIMIT 1`,
        [input.listingId]
      );
      const row = listingRow.rows[0] as any;
      if (row?.id && String(row.user_id) === String(authUserId)) {
        listingIdToSave = String(row.id);
      }
    }

    let inserted: any = null;
    let referenceCode = makeReferenceCode();
    let trackingToken = makeTrackingToken();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      referenceCode = attempt === 0 ? referenceCode : makeReferenceCode();
      trackingToken = attempt === 0 ? trackingToken : makeTrackingToken();

      try {
        const insertRes = await db.query(
          `INSERT INTO vehicle_sale_service_requests (
             source, status, reference_code, tracking_token, user_id, listing_id,
             owner_name, owner_email, owner_phone, owner_city,
             vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_mileage_km,
             desired_price, notes, ip, user_agent, metadata
           ) VALUES (
             'web', 'new', $1, $2, $3, $4,
             $5, $6, $7, $8,
             $9, $10, $11, $12, $13,
             $14, $15, $16, $17, $18::jsonb
           )
           RETURNING id, reference_code, tracking_token, created_at`,
          [
            referenceCode,
            trackingToken,
            authUserId,
            listingIdToSave,
            input.name,
            input.email,
            input.phone,
            input.city ?? null,
            input.vehicleType ?? null,
            input.brand ?? null,
            input.model ?? null,
            input.year ?? null,
            input.mileageKm ?? null,
            input.desiredPrice ?? null,
            input.notes ?? null,
            ip,
            userAgent,
            JSON.stringify({ consent: true, captcha: Boolean(hcaptchaSecret) }),
          ]
        );
        inserted = insertRes.rows[0] || null;
        if (inserted?.id) break;
      } catch (insertError: any) {
        const code = String(insertError?.code || '');
        if (code !== '23505') {
          throw insertError;
        }
      }
    }

    if (!inserted?.id) {
      return NextResponse.json({ error: 'No pudimos enviar tu solicitud. Intenta más tarde.' }, { status: 500 });
    }

    if (authUserId) {
      try {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, content, data, is_read)
           VALUES ($1, $2, $3, $4, $5::jsonb, false)`,
          [
            authUserId,
            'venta_asistida',
            'Solicitud recibida',
            `Recibimos tu solicitud de Venta Asistida. Código: ${inserted.reference_code}. Puedes revisar el estado en Seguimiento.`,
            JSON.stringify({
              request_id: inserted.id,
              reference_code: inserted.reference_code,
              tracking_token: inserted.tracking_token,
              kind: 'venta_asistida',
            }),
          ]
        );
      } catch (notifyErr) {
        logError('[services/vende-tu-auto] create notification failed', notifyErr);
      }
    }

    try {
      await maybeNotifyLeadEmail({
        referenceCode: String(inserted.reference_code || referenceCode),
        ownerName: input.name ?? null,
        ownerPhone: input.phone ?? null,
        ownerEmail: input.email ?? null,
        city: input.city ?? null,
        listingId: listingIdToSave,
        createdAtIso: String(inserted.created_at || new Date().toISOString()),
      });
    } catch (notifyErr) {
      logError('[services/vende-tu-auto] notify failed', notifyErr);
    }

    return NextResponse.json(
      {
        ok: true,
        referenceCode: String(inserted.reference_code || referenceCode),
        trackingToken: String(inserted.tracking_token || trackingToken),
      },
      { status: 200 }
    );
  } catch (err) {
    logError('[services/vende-tu-auto] POST error', err);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}
