import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDbPool();

    const allVehicles = await db.query(
      `SELECT id, title, user_id, status, visibility, created_at
       FROM listings
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const myVehicles = await db.query(
      `SELECT id, title, user_id, status, visibility, created_at
       FROM listings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({
      user_id: auth.userId,
      all_vehicles_count: allVehicles.rows.length || 0,
      all_vehicles: allVehicles.rows,
      my_vehicles_count: myVehicles.rows.length || 0,
      my_vehicles: myVehicles.rows,
      errors: { all: null, mine: null },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
