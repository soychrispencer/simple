import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { hasActiveBoost } from '@/lib/boostState';
import { logDebug, logError } from '@/lib/logger';

const DEBUG_VEHICLES_API = process.env.NODE_ENV !== 'production' && process.env.DEBUG_VEHICLES_API === '1';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    
    // Verificar autenticaci�n
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      if (DEBUG_VEHICLES_API) logDebug('[API /api/vehicles GET] No autenticado', authError?.message);
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (DEBUG_VEHICLES_API) logDebug('[API /api/vehicles GET] Usuario autenticado', user.id);

    // Obtener el ID del vertical de vehicles
    const { data: verticalData, error: verticalError } = await supabase
      .from('verticals')
      .select('id')
      .eq('key', 'vehicles')
      .single();

    if (verticalError || !verticalData) {
      if (DEBUG_VEHICLES_API) logDebug('[API /api/vehicles GET] Error obteniendo vertical', verticalError);
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 });
    }

    const verticalId = verticalData.id;

    // Obtener listings del usuario con datos de vehículos
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        price,
        created_at,
        updated_at,
        status,
        listing_type,
        visibility,
        image_urls,
        listing_boost_slots(is_active, ends_at),
        listings_vehicles!inner(
          year,
          mileage,
          type_id
        ),
        vehicle_types!listings_vehicles(type_id)(slug)
      `)
      .eq('user_id', user.id)
      .eq('vertical_id', verticalId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[API /api/vehicles GET] Error fetching vehicles', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (DEBUG_VEHICLES_API) logDebug('[API /api/vehicles GET] Vehículos encontrados', listings?.length || 0);

    // Formatear datos para el frontend
    const formattedVehicles = listings.map((listing: any) => {
      const featured = hasActiveBoost(listing.listing_boost_slots);
      return {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        year: listing.listings_vehicles?.year,
        mileage: listing.listings_vehicles?.mileage,
        status: listing.status,
        created_at: listing.created_at,
        updated_at: listing.updated_at,
        type_slug: listing.vehicle_types?.slug,
        featured,
        specs: {}, // specs se pueden agregar si es necesario
        images: (listing.image_urls || []).map((url: string, index: number) => ({
          id: `img-${listing.id}-${index}`,
          url: url,
          is_cover: index === 0,
          position: index
        }))
      };
    });

    return NextResponse.json({ 
      vehicles: formattedVehicles,
      count: formattedVehicles.length 
    });

  } catch (error: any) {
    logError('[API /api/vehicles GET] Unexpected error', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    
    // Verificar autenticaci�n
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener ID del veh�culo desde query params
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'ID de veh�culo requerido' }, { status: 400 });
    }

    // Verificar que el listing pertenece al usuario antes de eliminarlo
    const { data: listing, error: checkError } = await supabase
      .from('listings')
      .select('id, user_id')
      .eq('id', vehicleId)
      .single();

    if (checkError || !listing) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Eliminar publicación (CASCADE eliminará imágenes y datos específicos)
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', vehicleId);

    if (deleteError) {
      logError('[API /api/vehicles DELETE] Error deleting vehicle', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Veh�culo eliminado' });

  } catch (error: any) {
    logError('[API /api/vehicles DELETE] Unexpected error', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Use el formulario de nueva publicaci�n' }, { status: 501 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Use el formulario de edici�n' }, { status: 501 });
}



