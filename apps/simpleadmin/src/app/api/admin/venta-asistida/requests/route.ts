import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStaffGate } from '@/lib/admin/auth';
import { createAdminServerClient } from '@/lib/supabase/adminServerClient';

const QuerySchema = z.object({
	status: z.string().trim().max(40).optional(),
	q: z.string().trim().max(80).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export async function GET(request: Request) {
	const gate = await getStaffGate();
	if (gate.status === 'anon') {
		return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
	}
	if (gate.status !== 'staff') {
		return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
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
	const admin = createAdminServerClient();

	let query = admin
		.from('vehicle_sale_service_requests')
		.select(
			'id,created_at,status,source,reference_code,user_id,owner_name,owner_email,owner_phone,owner_city,listing_id,vehicle_type,vehicle_brand,vehicle_model,vehicle_year,vehicle_mileage_km,desired_price,notes,admin_notes,contacted_at,listings(id,title,status,created_at,published_at,price,currency,listings_vehicles(year,mileage,vehicle_types(slug,name),brands(name),models(name)),images(url,is_primary,position))',
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

	const normalized = (data ?? []).map((row: any) => {
		const listing = Array.isArray(row?.listings) ? row.listings[0] : row?.listings ?? null;
		return { ...row, listing };
	});

	return NextResponse.json({ ok: true, count: count ?? null, data: normalized }, { status: 200 });
}
