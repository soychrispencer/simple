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
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function GET(request: Request) {
  const adminCheck = await assertAdminUser(request);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    status: url.searchParams.get('status') || undefined,
    q: url.searchParams.get('q') || undefined,
    limit: url.searchParams.get('limit') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
  }

  const { status, q, limit } = parsed.data;
  const db = getDbPool();

  const params: any[] = [];
  const where: string[] = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (q) {
    const like = `%${q}%`;
    params.push(like, like, like, like);
    where.push(
      `(reference_code ILIKE $${params.length - 3} OR owner_name ILIKE $${params.length - 2} OR owner_email ILIKE $${params.length - 1} OR owner_phone ILIKE $${params.length})`
    );
  }
  params.push(limit);

  const query = await db.query(
    `SELECT id, created_at, status, source, reference_code, owner_name, owner_email, owner_phone, owner_city,
            listing_id, vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_mileage_km,
            desired_price, notes, admin_notes, contacted_at
     FROM vehicle_sale_service_requests
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return NextResponse.json({ ok: true, count: query.rows.length, data: query.rows || [] }, { status: 200 });
}
