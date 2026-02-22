import { NextRequest, NextResponse } from 'next/server';
import { createVehicleBoost } from '@/app/actions/boosts';
import { requireAuthUserId } from '@/lib/server/requireAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuthUserId(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const listingId = String(body?.listing_id || body?.listingId || '').trim();
    const planId = Number(body?.plan_id || body?.planId || 1);
    const durationDaysRaw = body?.durationDays;
    const durationDays =
      durationDaysRaw === null || durationDaysRaw === undefined
        ? undefined
        : Number.isFinite(Number(durationDaysRaw))
          ? Number(durationDaysRaw)
          : undefined;

    if (!listingId) {
      return NextResponse.json({ error: 'listing_id es requerido' }, { status: 400 });
    }

    const result = await createVehicleBoost(listingId, auth.userId, planId, durationDays);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'No se pudo crear boost', details: (result as any)?.details },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      boost: result.boost,
      message: 'Boost creado exitosamente',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
