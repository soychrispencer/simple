import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

function isAdminRole(value: unknown) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'admin' || v === 'staff' || v === 'superadmin';
}

async function assertAdminUser(request: Request) {
  const auth = requireAuthUserId(request);
  if ('error' in auth) return { ok: false as const, status: 401 as const, error: 'No autenticado' };

  const db = getDbPool();
  const profile = await db.query(
    `SELECT user_role, is_admin
     FROM profiles
     WHERE id = $1
     LIMIT 1`,
    [auth.userId]
  );
  const row = profile.rows[0] as any;
  const isAdmin = Boolean(row?.is_admin) || isAdminRole(row?.user_role);
  if (!isAdmin) return { ok: false as const, status: 403 as const, error: 'Sin permisos' };
  return { ok: true as const, authUserId: auth.userId };
}

const QuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  vertical: z.string().trim().max(40).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function GET(request: Request) {
  try {
    const admin = await assertAdminUser(request);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      status: url.searchParams.get('status') || undefined,
      vertical: url.searchParams.get('vertical') || undefined,
      q: url.searchParams.get('q') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
    }

    const { status, vertical, q, limit } = parsed.data;
    const params: any[] = [];
    const where: string[] = [];
    if (status) {
      params.push(status);
      where.push(`mpr.status = $${params.length}`);
    }
    if (vertical) {
      params.push(vertical);
      where.push(`v.key = $${params.length}`);
    }
    if (q) {
      const like = `%${q}%`;
      params.push(like, like, like);
      where.push(
        `(mpr.requester_name ILIKE $${params.length - 2} OR mpr.requester_email ILIKE $${params.length - 1} OR mpr.plan_key ILIKE $${params.length})`
      );
    }
    params.push(limit);

    const db = getDbPool();
    const data = await db.query(
      `SELECT mpr.id, mpr.created_at, mpr.request_type, mpr.plan_key, mpr.amount, mpr.currency, mpr.status,
              mpr.requester_name, mpr.requester_email, mpr.proof_note, mpr.admin_note, mpr.reviewed_at,
              v.key AS vertical_key, v.name AS vertical_name
       FROM manual_payment_requests mpr
       LEFT JOIN verticals v ON v.id = mpr.vertical_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY mpr.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return NextResponse.json({ ok: true, count: data.rows.length, data: data.rows || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
