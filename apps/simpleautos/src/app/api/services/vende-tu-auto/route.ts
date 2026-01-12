import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logError } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/serverSupabase';
import nodemailer from 'nodemailer';

const LeadSchema = z.object({
  // Honeypot anti-spam (debe venir vacío)
  company: z.string().optional().default(''),

  // Optional captcha token (only required if server secret is configured)
  captchaToken: z.string().trim().min(1).max(5000).optional(),

  listingId: z.string().uuid().optional(),

  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(6).max(40),
  city: z.string().trim().min(2).max(80).optional().or(z.literal('')).transform(v => (v ? v : undefined)),

  vehicleType: z.enum(['auto', 'moto', 'camioneta', 'camion', 'otro']).optional(),
  brand: z.string().trim().max(60).optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  model: z.string().trim().max(60).optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  year: z.coerce.number().int().min(1970).max(new Date().getFullYear() + 1).optional(),
  mileageKm: z.coerce.number().int().min(0).max(2_000_000).optional(),
  desiredPrice: z.coerce.number().min(0).max(10_000_000_000).optional(),

  notes: z.string().trim().max(2000).optional().or(z.literal('')).transform(v => (v ? v : undefined)),

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    if (input.company && input.company.trim().length > 0) {
      // Honeypot activado
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!input.consent) {
      return NextResponse.json({ error: 'Debes aceptar la política/consentimiento.' }, { status: 400 });
    }

    // Identificar usuario si está logueado (opcional)
    let authUserId: string | null = null;
    try {
      const sessionSupabase = await createServerClient();
      const { data } = await sessionSupabase.auth.getUser();
      authUserId = data?.user?.id ?? null;
    } catch {
      authUserId = null;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;

    // Optional captcha verification (enable by setting HCAPTCHA_SECRET_KEY)
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

    // Rate limit: per-IP caps (service-only table, safe to query with service role)
    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
        supabase
          .from('vehicle_sale_service_requests')
          .select('id', { count: 'exact', head: true })
          .eq('ip', ip)
          .gte('created_at', oneHourAgo),
        supabase
          .from('vehicle_sale_service_requests')
          .select('id', { count: 'exact', head: true })
          .eq('ip', ip)
          .gte('created_at', oneDayAgo),
      ]);

      const maxPerHour = Number(process.env.VENTA_ASISTIDA_MAX_PER_HOUR || 3);
      const maxPerDay = Number(process.env.VENTA_ASISTIDA_MAX_PER_DAY || 10);

      if ((hourCount ?? 0) >= maxPerHour || (dayCount ?? 0) >= maxPerDay) {
        return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
      }
    }

    let listingIdToSave: string | null = null;
    if (input.listingId && authUserId) {
      try {
        const { data: listingRow, error: listingErr } = await supabase
          .from('listings')
          .select('id,user_id')
          .eq('id', input.listingId)
          .maybeSingle();

        if (!listingErr && listingRow?.id && String((listingRow as any).user_id) === String(authUserId)) {
          listingIdToSave = String(listingRow.id);
        }
      } catch {
        // ignore
      }
    }

    let inserted: any = null;
    let insertError: any = null;
    let referenceCode = makeReferenceCode();
    let trackingToken = makeTrackingToken();

    // Reintento por colisión de código/token (muy raro, pero hay índices UNIQUE)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      referenceCode = attempt === 0 ? referenceCode : makeReferenceCode();
      trackingToken = attempt === 0 ? trackingToken : makeTrackingToken();

      const res = await supabase
        .from('vehicle_sale_service_requests')
        .insert({
          source: 'web',
          status: 'new',
          reference_code: referenceCode,
          tracking_token: trackingToken,
          user_id: authUserId,
          listing_id: listingIdToSave,
          owner_name: input.name,
          owner_email: input.email,
          owner_phone: input.phone,
          owner_city: input.city ?? null,
          vehicle_type: input.vehicleType ?? null,
          vehicle_brand: input.brand ?? null,
          vehicle_model: input.model ?? null,
          vehicle_year: input.year ?? null,
          vehicle_mileage_km: input.mileageKm ?? null,
          desired_price: input.desiredPrice ?? null,
          notes: input.notes ?? null,
          ip,
          user_agent: userAgent,
          metadata: { consent: true, captcha: Boolean(hcaptchaSecret) },
        })
        .select('id, reference_code, tracking_token, created_at')
        .maybeSingle();

      inserted = res.data;
      insertError = res.error;

      if (!insertError) break;
      const code = String((insertError as any)?.code || '');
      const msg = String((insertError as any)?.message || '');
      const isUnique = code === '23505' || msg.toLowerCase().includes('duplicate');
      const lower = msg.toLowerCase();
      const mentionsRef = lower.includes('reference') || lower.includes('idx_vehicle_sale_service_requests_reference_code');
      const mentionsToken = lower.includes('tracking') || lower.includes('idx_vehicle_sale_service_requests_tracking_token');
      if (!(isUnique && (mentionsRef || mentionsToken))) break;
    }

    if (insertError) {
      logError('[services/vende-tu-auto] insert failed', insertError);
      return NextResponse.json({ error: 'No pudimos enviar tu solicitud. Intenta más tarde.' }, { status: 500 });
    }

    // Notificación in-app para el usuario (si está logueado)
    if (authUserId) {
      try {
        const ref = String((inserted as any)?.reference_code || referenceCode);
        const token = String((inserted as any)?.tracking_token || trackingToken);
        await supabase.from('notifications').insert({
          user_id: authUserId,
          type: 'venta_asistida',
          title: 'Solicitud recibida',
          content: `Recibimos tu solicitud de Venta Asistida. Código: ${ref}. Puedes revisar el estado en Seguimiento.`,
          data: {
            request_id: (inserted as any)?.id ?? null,
            reference_code: ref,
            tracking_token: token,
            kind: 'venta_asistida',
          },
          is_read: false,
        } as any);
      } catch (notifyErr) {
        logError('[services/vende-tu-auto] create notification failed', notifyErr);
      }
    }

    try {
      await maybeNotifyLeadEmail({
        referenceCode: String((inserted as any)?.reference_code || referenceCode),
        ownerName: input.name ?? null,
        ownerPhone: input.phone ?? null,
        ownerEmail: input.email ?? null,
        city: input.city ?? null,
        listingId: listingIdToSave,
        createdAtIso: String((inserted as any)?.created_at || new Date().toISOString()),
      });
    } catch (notifyErr) {
      logError('[services/vende-tu-auto] notify failed', notifyErr);
    }

    return NextResponse.json(
      {
        ok: true,
        referenceCode: String((inserted as any)?.reference_code || referenceCode),
        trackingToken: String((inserted as any)?.tracking_token || trackingToken),
      },
      { status: 200 }
    );
  } catch (err) {
    logError('[services/vende-tu-auto] POST error', err);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}
