import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

const QuerySchema = z.object({
  code: z.string().trim().min(3).max(64).optional(),
  token: z.string().trim().min(20).max(200).optional(),
  email: z.string().trim().email().max(120).optional(),
});

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

type RateState = { count: number; resetAt: number };
function takeRateLimit(key: string, opts: { windowMs: number; max: number }): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const g = globalThis as any;
  const store: Map<string, RateState> = g.__ventaAsistidaStatusRateLimit ?? (g.__ventaAsistidaStatusRateLimit = new Map());

  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (current.count >= opts.max) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  store.set(key, current);
  return { ok: true };
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (ip) {
    const maxPer5Min = Number(process.env.VENTA_ASISTIDA_STATUS_MAX_PER_5MIN || 40);
    const rl = takeRateLimit(`ip:${ip}`, { windowMs: 5 * 60 * 1000, max: Number.isFinite(maxPer5Min) ? maxPer5Min : 40 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Intenta más tarde.' },
        { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } }
      );
    }
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    code: url.searchParams.get('code') || undefined,
    token: url.searchParams.get('token') || undefined,
    email: url.searchParams.get('email') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
  }

  const { code, token, email } = parsed.data;
  const auth = requireAuthUserId(request);
  const authUserId = 'error' in auth ? null : auth.userId;
  const db = getDbPool();

  if (authUserId && !code) {
    const rows = await db.query(
      `SELECT id, created_at, updated_at, status, reference_code
       FROM vehicle_sale_service_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [authUserId]
    );
    return NextResponse.json({ ok: true, mode: 'list', data: rows.rows || [] }, { status: 200 });
  }

  if (token) {
    const rowRes = await db.query(
      `SELECT id, created_at, updated_at, status, reference_code
       FROM vehicle_sale_service_requests
       WHERE tracking_token = $1
       LIMIT 1`,
      [token]
    );
    const row = rowRes.rows[0] as any;
    if (!row?.id) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(
      {
        ok: true,
        mode: 'single',
        data: {
          id: row.id,
          reference_code: row.reference_code,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      },
      { status: 200 }
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Falta code o token' }, { status: 400 });
  }
  if (!authUserId && !email) {
    return NextResponse.json({ error: 'Falta email' }, { status: 400 });
  }

  const rowRes = await db.query(
    `SELECT id, created_at, updated_at, status, reference_code, user_id, owner_email
     FROM vehicle_sale_service_requests
     WHERE reference_code = $1
     LIMIT 1`,
    [code]
  );
  const row = rowRes.rows[0] as any;
  if (!row?.id) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }

  if (authUserId) {
    if (String(row.user_id || '') !== String(authUserId)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
  } else {
    const rowEmail = String(row.owner_email || '').trim().toLowerCase();
    const inputEmail = String(email || '').trim().toLowerCase();
    if (!inputEmail || !rowEmail || rowEmail !== inputEmail) {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      mode: 'single',
      data: {
        id: row.id,
        reference_code: row.reference_code,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    },
    { status: 200 }
  );
}
