import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => (cookieStore as any) });

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API /boosts/create] Auth error:', authError);
      return NextResponse.json(
        { error: 'No autenticado', details: authError?.message },
        { status: 401 }
      );
    }

    console.log('✅ [API /boosts/create] Usuario autenticado:', user.id);

    // Parsear body
    const body = await request.json();
    const { vehicle_id, plan_id = 1 } = body;

    if (!vehicle_id) {
      return NextResponse.json(
        { error: 'vehicle_id es requerido' },
        { status: 400 }
      );
    }

    console.log('📝 [API /boosts/create] Datos recibidos:', { vehicle_id, plan_id, user_id: user.id });

    // Verificar que el vehículo pertenece al usuario
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      console.error('❌ [API /boosts/create] Error fetching vehicle:', vehicleError);
      return NextResponse.json(
        { error: 'Vehículo no encontrado', details: vehicleError?.message },
        { status: 404 }
      );
    }

    if (vehicle.owner_id !== user.id) {
      console.error('❌ [API /boosts/create] Usuario no es dueño del vehículo');
      return NextResponse.json(
        { error: 'No tienes permiso para impulsar este vehículo' },
        { status: 403 }
      );
    }

    console.log('✅ [API /boosts/create] Vehículo verificado, pertenece al usuario');

    // Verificar si ya existe un boost activo
    const { data: existingBoost, error: existingError } = await supabase
      .from('vehicle_boosts')
      .select('id, end_date')
      .eq('vehicle_id', vehicle_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingError) {
      console.error('❌ [API /boosts/create] Error checking existing boost:', existingError);
    }

    if (existingBoost) {
      console.log('✅ [API /boosts/create] Boost activo ya existe:', existingBoost.id);
      return NextResponse.json({
        success: true,
        boost: existingBoost,
        message: 'Boost activo ya existe'
      });
    }

    // Crear nuevo boost
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 15); // 15 días de duración

    const boostData = {
      vehicle_id,
      plan_id,
      user_id: user.id,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      payment_status: 'free'
    };

    console.log('📤 [API /boosts/create] Creando boost:', boostData);

    const { data: newBoost, error: createError } = await supabase
      .from('vehicle_boosts')
      .insert(boostData)
      .select('id, end_date')
      .single();

    if (createError) {
      console.error('❌ [API /boosts/create] Error creating boost:', createError);
      return NextResponse.json(
        { error: 'Error al crear el boost', details: createError.message, code: createError.code },
        { status: 500 }
      );
    }

    console.log('✅ [API /boosts/create] Boost creado exitosamente:', newBoost);

    return NextResponse.json({
      success: true,
      boost: newBoost,
      message: 'Boost creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [API /boosts/create] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
