import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/serverSupabase';

function isAdminRole(value: unknown) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'admin' || v === 'staff' || v === 'superadmin';
}

async function assertAdmin(adminSupabase: any) {
  const sessionSupabase = await createServerClient();
  const { data } = await sessionSupabase.auth.getUser();
  const authUserId = data?.user?.id ?? null;

  if (!authUserId) {
    return { ok: false as const, status: 401 as const, error: 'No autenticado' };
  }

  const { data: profileRow } = await adminSupabase
    .from('profiles')
    .select('user_role,is_admin')
    .eq('id', authUserId)
    .maybeSingle();

  const isAdmin = Boolean((profileRow as any)?.is_admin) || isAdminRole((profileRow as any)?.user_role);
  if (!isAdmin) {
    return { ok: false as const, status: 403 as const, error: 'Sin permisos' };
  }

  return { ok: true as const, authUserId };
}

const PatchSchema = z.object({
  status: z.string().trim().min(1).max(40).optional(),
  adminNotes: z.string().trim().max(5000).optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  contactedAt: z.string().datetime().optional().or(z.literal('')).transform(v => (v ? v : undefined)),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const adminCheck = await assertAdmin(adminSupabase);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const update: any = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) update.admin_notes = parsed.data.adminNotes ?? null;
  if (parsed.data.contactedAt) update.contacted_at = parsed.data.contactedAt;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { data: beforeRow } = await adminSupabase
    .from('vehicle_sale_service_requests')
    .select('id,status,admin_notes,contacted_at')
    .eq('id', id)
    .maybeSingle();

  if (!beforeRow?.id) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }

  const { error } = await adminSupabase
    .from('vehicle_sale_service_requests')
    .update(update)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }

  // Auditoría: registrar evento (best-effort)
  try {
    const prevStatus = String((beforeRow as any)?.status || '');
    const nextStatus = parsed.data.status ? String(parsed.data.status) : prevStatus;
    await adminSupabase.from('vehicle_sale_service_request_events').insert({
      request_id: id,
      actor_user_id: adminCheck.authUserId,
      actor_role: 'admin',
      event_type: 'admin_update',
      from_status: prevStatus || null,
      to_status: nextStatus || null,
      data: {
        patch: parsed.data,
        before: {
          status: (beforeRow as any)?.status ?? null,
          admin_notes: (beforeRow as any)?.admin_notes ?? null,
          contacted_at: (beforeRow as any)?.contacted_at ?? null,
        },
      },
    } as any);
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
