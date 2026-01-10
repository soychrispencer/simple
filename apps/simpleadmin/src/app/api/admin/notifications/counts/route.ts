import { NextResponse } from 'next/server';

import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import { getStaffGate } from '@/lib/admin/auth';

export async function GET() {
	const gate = await getStaffGate();
	if (gate.status !== 'staff') {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const supabase = createAdminServerClient();

	// Pending catalog moderation (verified=false)
	const [brandsPending, modelsPending, reportsOpen] = await Promise.all([
		supabase
			.from('brands')
			.select('id', { count: 'exact', head: true })
			.eq('is_verified', false),
		supabase
			.from('models')
			.select('id', { count: 'exact', head: true })
			.eq('is_verified', false),
		supabase
			.from('listing_reports')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'open'),
	]);

	if (brandsPending.error) {
		return NextResponse.json(
			{ error: brandsPending.error.message },
			{ status: 500 },
		);
	}
	if (modelsPending.error) {
		return NextResponse.json(
			{ error: modelsPending.error.message },
			{ status: 500 },
		);
	}
	if (reportsOpen.error) {
		return NextResponse.json(
			{ error: reportsOpen.error.message },
			{ status: 500 },
		);
	}

	const counts = {
		catalog: {
			brandsPending: brandsPending.count ?? 0,
			modelsPending: modelsPending.count ?? 0,
		},
		reports: {
			open: reportsOpen.count ?? 0,
		},
	};

	return NextResponse.json({ counts });
}
