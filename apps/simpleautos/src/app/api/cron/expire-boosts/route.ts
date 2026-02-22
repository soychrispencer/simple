import { NextResponse } from 'next/server';
import { logError, logInfo } from '@/lib/logger';
import { getDbPool } from '@/lib/server/db';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDbPool();
  try {
    const expiredSlots = await db.query(
      `UPDATE listing_boost_slots
       SET is_active = false,
           ends_at = COALESCE(ends_at, now())
       WHERE is_active = true
         AND ends_at IS NOT NULL
         AND ends_at <= now()
       RETURNING id, boost_id`
    );

    logInfo('[CRON] Boost expiration completed', {
      timestamp: new Date().toISOString(),
      expired: expiredSlots.rowCount,
      slots_cleaned: expiredSlots.rowCount,
    });

    return NextResponse.json({
      success: true,
      expired_count: expiredSlots.rowCount || 0,
      slots_cleaned: expiredSlots.rowCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logError('[CRON] Fatal error', error);
    return NextResponse.json(
      {
        error: error?.message || 'Error interno',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
