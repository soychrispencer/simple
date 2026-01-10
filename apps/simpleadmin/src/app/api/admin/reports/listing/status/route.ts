import { NextRequest, NextResponse } from 'next/server';

import { createAdminServerClient } from '@/lib/supabase/adminServerClient';
import { getStaffGate } from '@/lib/admin/auth';

type Status = 'open' | 'reviewing' | 'resolved' | 'rejected';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isStatus(value: string): value is Status {
  return value === 'open' || value === 'reviewing' || value === 'resolved' || value === 'rejected';
}

export async function POST(req: NextRequest) {
  const gate = await getStaffGate();
  if (gate.status !== 'staff') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = asString((body as any)?.id).trim();
  const statusRaw = asString((body as any)?.status).trim();

  if (!id || !isStatus(statusRaw)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from('listing_reports')
    .update({ status: statusRaw, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
