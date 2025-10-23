import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[API /api/vehicles GET] No autenticado:', authError?.message);
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    console.log('[API /api/vehicles GET] Usuario autenticado:', user.id);

    // Obtener vehículos del usuario con specs
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        title,
        price,
        year,
        mileage,
        status,
        created_at,
        updated_at,
        specs,
        vehicle_types!inner(slug),
        vehicle_media (
          id,
          url,
          is_cover,
          position
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /api/vehicles GET] Error fetching vehicles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API /api/vehicles GET] Vehículos encontrados:', vehicles?.length || 0);
    console.log('[API /api/vehicles GET] Datos:', JSON.stringify(vehicles, null, 2));

    // Formatear datos para el frontend
    const formattedVehicles = vehicles.map((v: any) => {
      return {
        id: v.id,
        title: v.title,
        price: v.price,
        year: v.year,
        mileage: v.mileage,
        status: v.status,
        created_at: v.created_at,
        updated_at: v.updated_at,
        type_slug: v.vehicle_types?.slug,
        specs: v.specs || {},
        images: v.vehicle_media
          ?.sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => ({
            id: img.id,
            url: img.url,
            is_cover: img.is_cover,
            position: img.position
          })) || []
      };
    });

    return NextResponse.json({ 
      vehicles: formattedVehicles,
      count: formattedVehicles.length 
    });

  } catch (error: any) {
    console.error('[API /api/vehicles GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => (cookieStore as any) });
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener ID del vehículo desde query params
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'ID de vehículo requerido' }, { status: 400 });
    }

    // Verificar que el vehículo pertenece al usuario antes de eliminarlo
    const { data: vehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', vehicleId)
      .single();

    if (checkError || !vehicle) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    if (vehicle.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Eliminar vehículo (CASCADE eliminará imágenes y specs)
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (deleteError) {
      console.error('[API /api/vehicles DELETE] Error deleting vehicle:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vehículo eliminado' });

  } catch (error: any) {
    console.error('[API /api/vehicles DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Use el formulario de nueva publicación' }, { status: 501 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Use el formulario de edición' }, { status: 501 });
}

