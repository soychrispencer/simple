import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

export async function GET(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get('limit') || 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  const unreadOnly = searchParams.get('unreadOnly') === '1';

  const db = getDbPool();
  const params: any[] = [auth.userId];
  let where = `user_id = $1`;
  if (unreadOnly) {
    params.push(false);
    where += ` AND is_read = $2`;
  }
  params.push(limit);

  const listQuery = await db.query(
    `SELECT *
     FROM notifications
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  const unreadQuery = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = false`,
    [auth.userId]
  );

  return NextResponse.json({
    notifications: listQuery.rows || [],
    unreadCount: Number(unreadQuery.rows[0]?.count || 0),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const markAll = Boolean(body?.markAll);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id: unknown) => String(id)).filter(Boolean)
    : [];
  const db = getDbPool();

  if (markAll) {
    await db.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [auth.userId]);
    return NextResponse.json({ ok: true });
  }

  if (ids.length > 0) {
    await db.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1
         AND id = ANY($2::uuid[])`,
      [auth.userId, ids]
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = requireAuthUserId(req);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const type = String(body?.type || '').trim();
  if (!type) return NextResponse.json({ error: 'type requerido' }, { status: 400 });

  let dataJson: any = null;
  if (body?.data != null) {
    if (typeof body.data === 'string') {
      try {
        dataJson = JSON.parse(body.data);
      } catch {
        dataJson = null;
      }
    } else {
      dataJson = body.data;
    }
  }

  const db = getDbPool();
  const inserted = await db.query(
    `INSERT INTO notifications (user_id, type, title, content, data, is_read)
     VALUES ($1, $2, $3, $4, $5::jsonb, false)
     RETURNING *`,
    [
      auth.userId,
      type,
      String(body?.title || 'Notificación'),
      body?.body ?? body?.content ?? null,
      JSON.stringify(dataJson),
    ]
  );

  return NextResponse.json({ notification: inserted.rows[0] || null });
}
