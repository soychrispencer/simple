import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

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

  const auth = requireAuthUserId(req);
  if ('error' in auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getDbPool();
  try {
    await db.query(
      `INSERT INTO listing_reports (listing_id, reason, details, reporter_user_id)
       VALUES ($1, $2, $3, $4)`,
      [listingId, reason, details, auth.userId]
    );
  } catch {
    // Fallback para esquemas previos sin reporter_user_id.
    await db.query(
      `INSERT INTO listing_reports (listing_id, reason, details)
       VALUES ($1, $2, $3)`,
      [listingId, reason, details]
    );
  }

  return NextResponse.json({ ok: true });
}
