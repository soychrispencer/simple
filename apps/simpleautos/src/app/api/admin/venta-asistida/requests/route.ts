import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/serverSupabase';

function isAdminRole(value: unknown) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'admin' || v === 'staff' || v === 'superadmin';
}

async function assertAdminUser(adminSupabase: any) {
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

const QuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase env no configurado' }, { status: 500 });
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const adminCheck = await assertAdminUser(adminSupabase);
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

  let query = adminSupabase
    .from('vehicle_sale_service_requests')
    .select(
      'id,created_at,status,source,reference_code,owner_name,owner_email,owner_phone,owner_city,listing_id,vehicle_type,vehicle_brand,vehicle_model,vehicle_year,vehicle_mileage_km,desired_price,notes,admin_notes,contacted_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `reference_code.ilike.${like},owner_name.ilike.${like},owner_email.ilike.${like},owner_phone.ilike.${like}`
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: 'No se pudo cargar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: count ?? null, data: data ?? [] }, { status: 200 });
}
