import { NextRequest, NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies as getCookies } from 'next/headers';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const listingId = asString((body as any)?.listingId).trim();
  const reason = asString((body as any)?.reason).trim();
  const details = asString((body as any)?.details).trim();

  if (!listingId || !reason || !details) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  const cookiesObj = await getCookies();
  const supabase = createRouteHandlerClient({ cookies: () => (cookiesObj as any) });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('listing_reports')
    .insert({ listing_id: listingId, reason, details });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
