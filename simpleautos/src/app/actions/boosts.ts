'use server';

import { createClient } from '@supabase/supabase-js';

export async function createVehicleBoost(vehicleId: string, userId: string, planId: number = 1) {
  try {
    console.log('✅ [Server Action] Iniciando con userId:', userId, 'vehicleId:', vehicleId);

    // Usar service role client directamente (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !serviceKey) {
      console.error('❌ [Server Action] Faltan variables de entorno');
      return {
        success: false,
        error: 'Configuración del servidor incompleta'
      };
    }
    
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verificar que el vehículo existe y pertenece al usuario
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('❌ [Server Action] Error fetching vehicle:', vehicleError);
      return {
        success: false,
        error: 'Vehículo no encontrado',
        details: vehicleError?.message
      };
    }

    if (vehicle.owner_id !== userId) {
      console.error('❌ [Server Action] Usuario no es dueño del vehículo');
      console.error('Vehicle owner:', vehicle.owner_id, 'Provided userId:', userId);
      return {
        success: false,
        error: 'No tienes permiso para impulsar este vehículo'
      };
    }

    console.log('✅ [Server Action] Vehículo verificado, pertenece al usuario');

    // Verificar si ya existe un boost activo
    const { data: existingBoost, error: existingError } = await adminClient
      .from('vehicle_boosts')
      .select('id, end_date')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingError) {
      console.error('❌ [Server Action] Error checking existing boost:', existingError);
    }

    if (existingBoost) {
      console.log('✅ [Server Action] Boost activo ya existe:', existingBoost.id);
      return {
        success: true,
        boost: existingBoost,
        message: 'Boost activo ya existe'
      };
    }

    // Crear nuevo boost con admin client (bypass RLS)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 15); // 15 días de duración

    const boostData = {
      vehicle_id: vehicleId,
      plan_id: planId,
      user_id: userId, // Usamos el userId verificado
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active' as const,
      payment_status: 'free' as const
    };

    console.log('📤 [Server Action] Creando boost con admin client:', boostData);

    const { data: newBoost, error: createError } = await adminClient
      .from('vehicle_boosts')
      .insert(boostData)
      .select('id, end_date')
      .single();

    if (createError) {
      console.error('❌ [Server Action] Error creating boost:', createError);
      return {
        success: false,
        error: 'Error al crear el boost',
        details: createError.message,
        code: createError.code
      };
    }

    console.log('✅ [Server Action] Boost creado exitosamente:', newBoost);

    return {
      success: true,
      boost: newBoost,
      message: 'Boost creado exitosamente'
    };

  } catch (error) {
    console.error('❌ [Server Action] Error inesperado:', error);
    return {
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateVehicleBoostSlots(
  vehicleId: string,
  userId: string,
  activeSlotIds: number[]
) {
  try {
    console.log('✅ [Server Action - Slots] Iniciando con userId:', userId, 'vehicleId:', vehicleId, 'slots:', activeSlotIds);

    // Usar service role client directamente (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !serviceKey) {
      console.error('❌ [Server Action - Slots] Faltan variables de entorno');
      return {
        success: false,
        error: 'Configuración del servidor incompleta'
      };
    }
    
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verificar que el vehículo pertenece al usuario
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('❌ [Server Action - Slots] Error fetching vehicle:', vehicleError);
      return {
        success: false,
        error: 'Vehículo no encontrado'
      };
    }

    if (vehicle.owner_id !== userId) {
      console.error('❌ [Server Action - Slots] Usuario no es dueño del vehículo');
      return {
        success: false,
        error: 'No tienes permiso para modificar este vehículo'
      };
    }

    console.log('✅ [Server Action - Slots] Vehículo verificado');

    // Obtener slots actuales
    const { data: currentSlots } = await adminClient
      .from('vehicle_boost_slots')
      .select('slot_id, id')
      .eq('vehicle_id', vehicleId)
      .eq('is_active', true);

    const currentSlotIds = (currentSlots || []).map((item: any) => item.slot_id);

    console.log('📊 [Server Action - Slots] Slots actuales:', currentSlotIds);
    console.log('📊 [Server Action - Slots] Nuevos slots:', activeSlotIds);

    // Determinar qué agregar y qué remover
    const toAdd = activeSlotIds.filter(id => !currentSlotIds.includes(id));
    const toRemove = currentSlotIds.filter((id: number) => !activeSlotIds.includes(id));

    console.log('➕ [Server Action - Slots] Para agregar:', toAdd);
    console.log('➖ [Server Action - Slots] Para remover:', toRemove);

    let addedCount = 0;
    let removedCount = 0;

    // Remover slots desmarcados
    if (toRemove.length > 0) {
      const idsToDeactivate = (currentSlots || [])
        .filter((item: any) => toRemove.includes(item.slot_id))
        .map((item: any) => item.id);

      console.log('🗑️ [Server Action - Slots] IDs a desactivar:', idsToDeactivate);

      const { error: deactivateError } = await adminClient
        .from('vehicle_boost_slots')
        .update({ is_active: false })
        .in('id', idsToDeactivate);

      if (deactivateError) {
        console.error('❌ [Server Action - Slots] Error deactivating slots:', deactivateError);
      } else {
        removedCount = idsToDeactivate.length;
        console.log('✅ [Server Action - Slots] Desactivados:', removedCount);
      }
    }

    // Agregar nuevos slots
    if (toAdd.length > 0) {
      // Obtener el boost activo del vehículo
      const { data: boost } = await adminClient
        .from('vehicle_boosts')
        .select('id, end_date')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'active')
        .maybeSingle();

      if (!boost) {
        console.error('❌ [Server Action - Slots] No hay boost activo para agregar slots');
        
        // Si solo hay slots para agregar y no hay boost, es un error
        if (toRemove.length === 0) {
          return {
            success: false,
            error: 'No hay boost activo para este vehículo. Por favor, crea primero el boost.'
          };
        }
        
        // Si hay slots para remover, continuamos sin error
        console.log('⚠️ [Server Action - Slots] Continuando solo con la remoción de slots');
        addedCount = 0;
      } else {
        // Si hay boost, insertamos los slots
        const now = new Date();
        const slotsToInsert = toAdd.map(slotId => ({
          boost_id: boost.id,
          vehicle_id: vehicleId,
          slot_id: slotId,
          start_date: now.toISOString(),
          end_date: boost.end_date,
          is_active: true
        }));

        console.log('➕ [Server Action - Slots] Insertando slots:', slotsToInsert);

        const { error: insertError } = await adminClient
          .from('vehicle_boost_slots')
          .insert(slotsToInsert);

        if (insertError) {
          console.error('❌ [Server Action - Slots] Error inserting slots:', insertError);
        } else {
          addedCount = slotsToInsert.length;
          console.log('✅ [Server Action - Slots] Insertados:', addedCount);
        }
      }
    }

    console.log('✅ [Server Action - Slots] Completado: +' + addedCount + ', -' + removedCount);

    return {
      success: true,
      addedCount,
      removedCount
    };

  } catch (error) {
    console.error('❌ [Server Action - Slots] Error inesperado:', error);
    return {
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
