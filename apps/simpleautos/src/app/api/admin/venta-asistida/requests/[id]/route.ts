import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

function isAdminRole(value: unknown) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'admin' || v === 'staff' || v === 'superadmin';
}

async function assertAdmin(request: Request) {
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

const PatchSchema = z.object({
  status: z.string().trim().min(1).max(40).optional(),
  adminNotes: z.string().trim().max(5000).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  contactedAt: z.string().datetime().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const admin = await assertAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) update.admin_notes = parsed.data.adminNotes ?? null;
  if (parsed.data.contactedAt) update.contacted_at = parsed.data.contactedAt;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const db = getDbPool();
  const beforeRes = await db.query(
    `SELECT id, status, admin_notes, contacted_at
     FROM vehicle_sale_service_requests
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  const beforeRow = beforeRes.rows[0] as any;
  if (!beforeRow?.id) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }

  const fields: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(update)) {
    params.push(value);
    fields.push(`${key} = $${params.length}`);
  }
  params.push(id);
  await db.query(
    `UPDATE vehicle_sale_service_requests
     SET ${fields.join(', ')}
     WHERE id = $${params.length}`,
    params
  );

  try {
    const prevStatus = String(beforeRow?.status || '');
    const nextStatus = parsed.data.status ? String(parsed.data.status) : prevStatus;
    await db.query(
      `INSERT INTO vehicle_sale_service_request_events
       (request_id, actor_user_id, actor_role, event_type, from_status, to_status, data)
       VALUES ($1, $2, 'admin', 'admin_update', $3, $4, $5::jsonb)`,
      [
        id,
        admin.authUserId,
        prevStatus || null,
        nextStatus || null,
        JSON.stringify({
          patch: parsed.data,
          before: {
            status: beforeRow?.status ?? null,
            admin_notes: beforeRow?.admin_notes ?? null,
            contacted_at: beforeRow?.contacted_at ?? null,
          },
        }),
      ]
    );
  } catch {
    // best effort
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
