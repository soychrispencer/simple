import { ensureListingBoost } from '@simple/listings';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';

const DEFAULT_DURATION_DAYS = 15;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado', details: authError?.message }, { status: 401 });
    }

    const body = await request.json();
    const { listing_id, plan_id = 1 } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id es requerido' }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, user_id, company_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Publicación no encontrada', details: listingError?.message }, { status: 404 });
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para impulsar esta publicación' }, { status: 403 });
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + DEFAULT_DURATION_DAYS);

    const boost = await ensureListingBoost({
      supabase,
      listingId: listing_id,
      companyId: listing.company_id,
      userId: user.id,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      metadata: { planId: plan_id },
    });

    return NextResponse.json({ success: true, boost, message: 'Boost creado exitosamente' });
  } catch (error) {
    logError('[API /boosts/create] error', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


