import { dataURLToFile } from './image';
import { v4 as uuid } from 'uuid';
import { useSupabase } from './supabase/useSupabase';
import { buildVehicleInsertPayload } from './builders/buildVehicleInsertPayload';
import { saveVehicleSpecs, saveVehicleFeatures } from './saveVehicleSpecs';
import { uploadVehicleImage, deleteVehicleImages } from './supabaseStorage';

// Hook que retorna función para subir imágenes y crear vehículo
export function useSubmitVehicle() {
  const supabase = useSupabase();

  async function uploadImage(fileOrData: File | { dataUrl: string }): Promise<string | null> {
    try {
      let file: File;
      if (fileOrData instanceof File) file = fileOrData;
      else file = dataURLToFile(fileOrData.dataUrl, 'image.webp');
      const id = uuid();
      const fileName = `${id}.webp`;
      return await uploadVehicleImage(supabase, fileName, file);
    } catch (e) {
      console.error('uploadImage error', e);
      return null;
    }
  }

  async function submit(payload: any, images: any[]): Promise<{ id?: string; error?: any; warnings?: string[] }> {
    const isEditing = !!payload.vehicle_id;
    
    // Resolver type_id UUID desde type_key (slug) si existe
    let resolvedTypeId: string | null = null;
    const typeSlug = payload.vehicle?.type_key || payload.type_key;
    if (typeSlug) {
      const { data: vtype, error: vtErr } = await supabase
        .from('vehicle_types')
        .select('id')
        .eq('slug', typeSlug)
        .single();
      if (!vtErr && vtype?.id) {
        resolvedTypeId = vtype.id;
      }
    }
    
    // Detectar si ya tiene URLs remotas válidas (no dataURLs)
    const hasRemoteUrls = payload?.image_urls?.length > 0 && 
      payload.image_urls.every((url: string) => url.startsWith('http'));
    
    const preBuilt = hasRemoteUrls;

    // Subir imágenes que aún no tengan url remota
    const finalUrls: string[] = [];
    if (!preBuilt) {
      for (const img of images) {
        // Si ya es una URL remota, mantenerla
        if (img.url && img.url.startsWith('http')) { 
          finalUrls.push(img.url); 
          continue; 
        }
        // Si es un File, subirlo
        if (img.file) {
          const remote = await uploadImage(img.file);
          if (remote) finalUrls.push(remote);
        } 
        // Si es dataUrl, convertir y subir
        else if (img.dataUrl) {
          const remote = await uploadImage({ dataUrl: img.dataUrl });
          if (remote) finalUrls.push(remote);
        }
      }
    }

    let insertPayload: any;
    if (preBuilt) {
      insertPayload = { ...payload, updated_at: new Date().toISOString() };
    } else {
      // Construimos usando nuevo util partiendo del shape wizard-like
      const rebuilt = buildVehicleInsertPayload({ state: { basic: payload.basic || {}, vehicle: payload.vehicle || {}, commercial: payload.commercial || {}, media: payload.media || {}, listing_type: payload.listing_type }, images });
      insertPayload = { ...rebuilt, image_urls: finalUrls };
    }
    
    // Sobrescribir type_id con el UUID resuelto si existe
    if (resolvedTypeId) {
      insertPayload.type_id = resolvedTypeId;
    }

    // IMPORTANTE: 'color' ya se guarda dentro de extra_specs. Evitar enviar top-level color
    if ('color' in insertPayload) {
      // moverlo a extra_specs si no está allí
      insertPayload.extra_specs = insertPayload.extra_specs || {};
      if (insertPayload.color !== undefined) insertPayload.extra_specs.color = insertPayload.color;
      delete insertPayload.color;
    }

    insertPayload.extra_specs = {
      ...(insertPayload.extra_specs || {}),
      main_image: (insertPayload.image_urls && insertPayload.image_urls.length) ? insertPayload.image_urls[0] : null,
    };

    if ('financing_available' in insertPayload) {
      insertPayload.allow_financing = !!insertPayload.financing_available;
      delete insertPayload.financing_available;
    }
    if ('exchange_considered' in insertPayload) {
      insertPayload.allow_exchange = !!insertPayload.exchange_considered;
      delete insertPayload.exchange_considered;
    }
    if ('offer_price' in insertPayload) {
      insertPayload.extra_specs.offer_price = insertPayload.offer_price;
      delete insertPayload.offer_price;
    }
    if ('discount_type' in insertPayload) {
      insertPayload.extra_specs.discount_type = insertPayload.discount_type;
      delete insertPayload.discount_type;
    }
    if ('discount_valid_until' in insertPayload) {
      insertPayload.extra_specs.discount_valid_until = insertPayload.discount_valid_until;
      delete insertPayload.discount_valid_until;
    }
    if ('discount_percent' in insertPayload) {
      insertPayload.extra_specs.discount_percent = insertPayload.discount_percent;
      delete insertPayload.discount_percent;
    }
    if ('type_key' in insertPayload) {
      insertPayload.extra_specs.type_key = insertPayload.type_key;
      delete insertPayload.type_key;
    }
    if ('main_image' in insertPayload) {
      delete insertPayload.main_image;
    }
    if (!Array.isArray(insertPayload.document_urls)) {
      insertPayload.document_urls = insertPayload.document_urls ? [insertPayload.document_urls].filter(Boolean) : [];
    }

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) return { error: authError };
    const authUser = userData?.user;
    if (!authUser?.id) {
      return { error: new Error('Debes iniciar sesión para publicar vehículos.') };
    }

    const { data: profileRow, error: profileByIdError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (profileByIdError) return { error: profileByIdError };

    if (!profileRow?.id) {
      return { error: new Error('No se encontró un perfil asociado al usuario autenticado. Completa tu perfil antes de publicar.') };
    }

    insertPayload.owner_id = insertPayload.owner_id || profileRow.id;

    // Validar campos obligatorios
    if (!insertPayload.title || insertPayload.title.trim() === '') {
      return { error: new Error('El título del vehículo es obligatorio.') };
    }
    if (!insertPayload.listing_type) {
      return { error: new Error('El tipo de publicación es obligatorio.') };
    }

    let id: string;
    if (isEditing) {
      // Modo edición: UPDATE
      const vehicleId = payload.vehicle_id;
      
      // Obtener imágenes antiguas para limpiar las que ya no están
      const { data: oldVehicle } = await supabase
        .from('vehicles')
        .select('image_urls')
        .eq('id', vehicleId)
        .single();
      
      const oldUrls = oldVehicle?.image_urls || [];
      const urlsToDelete = oldUrls.filter((oldUrl: string) => !finalUrls.includes(oldUrl));
      
      if (urlsToDelete.length > 0) {
        await deleteVehicleImages(supabase, urlsToDelete);
      }
      
      // Actualizar vehículo
      const updateResult = await supabase
        .from('vehicles')
        .update({ ...insertPayload, updated_at: new Date().toISOString() })
        .eq('id', vehicleId)
        .select('id')
        .single();
      
      if (updateResult.error) return { error: updateResult.error };
      id = vehicleId;
    } else {
      // Modo creación: INSERT
      const insertResult = await supabase
        .from('vehicles')
        .insert([insertPayload])
        .select('id')
        .single();
      
      if (insertResult.error) return { error: insertResult.error };
      id = insertResult.data?.id;
    }

    const warnings: string[] = [];
    // Extraer typeKey desde múltiples fuentes posibles
    const typeKey = preBuilt 
      ? (insertPayload.extra_specs?.type_key || payload.vehicle?.type_key || payload.type_key)
      : (payload.vehicle?.type_key || payload.type_key);
    
    const specs = preBuilt ? insertPayload.extra_specs : (payload.vehicle?.specs || payload.specs || {});
    const features: string[] = preBuilt 
      ? (insertPayload.extra_specs?.features || []) 
      : (payload.vehicle?.features || payload.features || []);
    
    if (id && typeKey) {
      try {
        // Guardar proyección a tablas especializadas + actualización extra_specs (idempotente)
        await saveVehicleSpecs({ vehicleId: id, typeSlug: typeKey, specs });
        // Guardar features en tabla pivot
        if (features.length > 0) {
          await saveVehicleFeatures(id, features);
        }
        // Guardar condiciones comerciales avanzadas
        const advancedConditions = payload.commercial?.advanced_conditions;
        if (advancedConditions) {
          await saveCommercialConditions(id, payload.listing_type, advancedConditions);
        }
      } catch (e:any) {
        console.warn('[submitVehicle] Warning al guardar specs/features/conditions', e);
        warnings.push('No se pudieron guardar las especificaciones detalladas, equipamiento o condiciones comerciales.');
      }
    } else {
      console.warn('[submitVehicle] No se pudo guardar specs: id=', id, 'typeKey=', typeKey);
    }

    return { id, warnings: warnings.length ? warnings : undefined };
  }

  /**
   * Actualiza un vehículo existente.
   * Elimina las imágenes antiguas que ya no están en el nuevo array.
   */
  async function update(vehicleId: string, payload: any, images: any[]): Promise<{ error?: any; warnings?: string[] }> {
    // Obtener el vehículo actual para comparar imágenes
    const { data: currentVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('image_urls')
      .eq('id', vehicleId)
      .single();
    
    if (fetchError) return { error: fetchError };

    const oldUrls = currentVehicle?.image_urls || [];
    
    // Subir nuevas imágenes
    const hasRemoteUrls = payload?.image_urls?.length > 0 && 
      payload.image_urls.every((url: string) => url.startsWith('http'));
    
    const finalUrls: string[] = [];
    if (!hasRemoteUrls) {
      for (const img of images) {
        if (img.url && img.url.startsWith('http')) { 
          finalUrls.push(img.url); 
          continue; 
        }
        if (img.file) {
          const remote = await uploadImage(img.file);
          if (remote) finalUrls.push(remote);
        } else if (img.dataUrl) {
          const remote = await uploadImage({ dataUrl: img.dataUrl });
          if (remote) finalUrls.push(remote);
        }
      }
    } else {
      finalUrls.push(...payload.image_urls);
    }

    // Identificar imágenes a eliminar (las que estaban pero ya no están)
    const urlsToDelete = oldUrls.filter((oldUrl: string) => !finalUrls.includes(oldUrl));
    if (urlsToDelete.length > 0) {
      console.log('[submitVehicle] Eliminando imágenes antiguas:', urlsToDelete);
      await deleteVehicleImages(supabase, urlsToDelete);
    }

    // Actualizar el vehículo
    const updatePayload = {
      ...payload,
      image_urls: finalUrls,
      updated_at: new Date().toISOString(),
      extra_specs: {
        ...(payload.extra_specs || {}),
        main_image: finalUrls[0] || null,
      }
    };

    const { error } = await supabase
      .from('vehicles')
      .update(updatePayload)
      .eq('id', vehicleId);
    
    if (error) return { error };

    return {};
  }

  // Función para guardar condiciones comerciales avanzadas
  async function saveCommercialConditions(vehicleId: string, listingType: string, advancedConditions: any) {
    if (!advancedConditions) return;

    const commercialData = {
      vehicle_id: vehicleId,
      mode: listingType,
      financing: advancedConditions.financing || [],
      bonuses: advancedConditions.bonuses || [],
      discounts: advancedConditions.discounts || [],
      additional_conditions: advancedConditions.additional_conditions || null,
      // Campos básicos que pueden venir del wizard
      negotiable: advancedConditions.negotiable || false,
      allows_tradein: advancedConditions.allows_tradein || false,
      warranty: advancedConditions.warranty || null,
      delivery_immediate: advancedConditions.delivery_immediate || false,
      documentation_complete: advancedConditions.documentation_complete || false,
      in_consignment: advancedConditions.in_consignment || false,
      billable: advancedConditions.billable || false,
    };

    const { error } = await supabase
      .from('commercial_conditions')
      .upsert(commercialData, { onConflict: 'vehicle_id,mode' });

    if (error) throw error;
  }

  return { submit, update };
}
