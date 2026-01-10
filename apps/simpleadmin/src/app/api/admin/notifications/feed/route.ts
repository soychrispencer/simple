import { NextResponse } from 'next/server';

import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import { getStaffGate } from '@/lib/admin/auth';

type FeedItem = {
	type: 'brand' | 'model' | 'report';
	id: string;
	title: string;
	subtitle?: string;
	createdAt: string;
	href: string;
};

function asIso(value: unknown): string {
	if (typeof value === 'string') return value;
	return new Date().toISOString();
}

function reasonLabel(reason: unknown): string | undefined {
	if (typeof reason !== 'string') return undefined;
	switch (reason) {
		case 'fraud':
			return 'Posible fraude / estafa';
		case 'misleading':
			return 'Información engañosa';
		case 'prohibited':
			return 'Contenido prohibido';
		case 'duplicate':
			return 'Publicación duplicada';
		case 'spam':
			return 'Spam';
		case 'other':
			return 'Otro';
		default:
			return reason;
	}
}

export async function GET() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const supabase = createAdminServerClient();

	const [brandsRes, modelsRes, reportsRes] = await Promise.all([
		supabase
			.from('brands')
			.select('id,name,created_at')
			.eq('is_verified', false)
			.order('created_at', { ascending: false })
			.limit(5),
		supabase
			.from('models')
			.select('id,name,created_at,brands(name),vehicle_types(slug)')
			.eq('is_verified', false)
			.order('created_at', { ascending: false })
			.limit(5),
		supabase
			.from('listing_reports')
			.select('id,created_at,reason,listing_id,listings(title)')
			.eq('status', 'open')
			.order('created_at', { ascending: false })
			.limit(5),
	]);

	if (brandsRes.error) {
		return NextResponse.json({ error: brandsRes.error.message }, { status: 500 });
	}
	if (modelsRes.error) {
		return NextResponse.json({ error: modelsRes.error.message }, { status: 500 });
	}
	if (reportsRes.error) {
		return NextResponse.json({ error: reportsRes.error.message }, { status: 500 });
	}

	const items: FeedItem[] = [];

	for (const b of brandsRes.data ?? []) {
		items.push({
			type: 'brand',
			id: b.id,
			title: b.name,
			createdAt: asIso(b.created_at),
			href: `/?vertical=autos&focus=brand:${b.id}#pending-brands`,
		});
	}

	for (const m of modelsRes.data ?? []) {
		const brandName = m.brands?.[0]?.name;
		const typeSlug = m.vehicle_types?.[0]?.slug;
		const subtitle = [brandName, typeSlug].filter(Boolean).join(' · ');

		items.push({
			type: 'model',
			id: m.id,
			title: m.name,
			subtitle: subtitle || undefined,
			createdAt: asIso(m.created_at),
			href: `/?vertical=autos&focus=model:${m.id}#pending-models`,
		});
	}

	for (const r of (reportsRes.data ?? []) as any[]) {
		const listingTitle = r.listings?.[0]?.title;
		items.push({
			type: 'report',
			id: r.id,
			title: listingTitle ? `Reporte: ${listingTitle}` : 'Reporte de publicación',
			subtitle: reasonLabel(r.reason),
			createdAt: asIso(r.created_at),
			href: '/?vertical=autos#vehicle-reports',
		});
	}

	items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

	return NextResponse.json({ items: items.slice(0, 8) });
}
