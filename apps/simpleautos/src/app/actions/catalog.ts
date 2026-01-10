'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/serverSupabase';
import { logError } from '@/lib/logger';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: string };

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan credenciales de Supabase para acciones de catálogo');
  }
  return createClient(supabaseUrl, serviceKey);
}

function cleanName(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function normalizeForMatch(raw: string) {
  const cleaned = cleanName(raw);
  // Aproxima el normalize_catalog_name() (lower + unaccent + trim + collapse spaces)
  // usando NFD para remover diacríticos en JS.
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function getRequestUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function upsertBrand(params: { name: string }): Promise<ActionResult<{ id: string; name: string; is_verified: boolean }>> {
  try {
    const name = cleanName(params.name || '');
    if (!name || name.length < 2) {
      return { ok: false, error: 'Nombre de marca inválido' };
    }

    const admin = getAdminClient();

    // Si hay usuario autenticado, lo dejamos como created_by (trazabilidad)
    const userId = await getRequestUserId();

    const nameNorm = normalizeForMatch(name);

    // Preferimos match por name_norm (si la migración ya fue aplicada).
    // Si la columna no existe aún, caemos a ILIKE.
    const { data: byNorm, error: byNormError } = await admin
      .from('brands')
      .select('id,name,is_verified')
      .eq('name_norm', nameNorm)
      .limit(1);

    if (!byNormError && byNorm && byNorm.length) {
      const found = byNorm[0];
      return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
    }

    // Fallback: búsqueda directa por ILIKE exact (case-insensitive)
    const { data: exact, error: exactError } = await admin
      .from('brands')
      .select('id,name,is_verified')
      .ilike('name', name)
      .limit(1);

    if (!exactError && exact && exact.length) {
      const found = exact[0];
      return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
    }

    const { data: inserted, error: insertError } = await admin
      .from('brands')
      .insert({
        name,
        is_verified: false,
        created_by: userId,
      })
      .select('id,name,is_verified')
      .single();

    if (insertError || !inserted) {
      // Si chocó por unique (name o name_norm), reintentamos leer
      const { data: retry, error: retryError } = await admin
        .from('brands')
        .select('id,name,is_verified')
        .eq('name_norm', nameNorm)
        .limit(1);

      if (!retryError && retry && retry.length) {
        const found = retry[0];
        return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
      }

      const { data: retry2, error: retry2Error } = await admin
        .from('brands')
        .select('id,name,is_verified')
        .ilike('name', name)
        .limit(1);

      if (!retry2Error && retry2 && retry2.length) {
        const found = retry2[0];
        return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
      }

      return { ok: false, error: 'No pudimos crear la marca', details: insertError?.message };
    }

    return { ok: true, data: inserted };
  } catch (error: any) {
    logError('[actions.upsertBrand] error', error);
    return { ok: false, error: 'Error interno del servidor', details: error?.message };
  }
}

export async function upsertModel(params: {
  brandId: string;
  vehicleTypeId: string;
  name: string;
}): Promise<ActionResult<{ id: string; name: string; is_verified: boolean }>> {
  try {
    const name = cleanName(params.name || '');
    const brandId = params.brandId;
    const vehicleTypeId = params.vehicleTypeId;

    if (!brandId) return { ok: false, error: 'Falta la marca' };
    if (!vehicleTypeId) return { ok: false, error: 'Falta el tipo de vehículo' };
    if (!name || name.length < 1) return { ok: false, error: 'Nombre de modelo inválido' };

    const admin = getAdminClient();
    const userId = await getRequestUserId();

    const nameNorm = normalizeForMatch(name);

    // Preferimos match por (brand_id, name_norm) si existe.
    const { data: byNorm, error: byNormError } = await admin
      .from('models')
      .select('id,name,is_verified')
      .eq('brand_id', brandId)
      .eq('name_norm', nameNorm)
      .limit(1);

    if (!byNormError && byNorm && byNorm.length) {
      const found = byNorm[0];
      return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
    }

    // Fallback: ILIKE exact
    const { data: exact, error: exactError } = await admin
      .from('models')
      .select('id,name,is_verified')
      .eq('brand_id', brandId)
      .ilike('name', name)
      .limit(1);

    if (!exactError && exact && exact.length) {
      const found = exact[0];
      return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
    }

    const { data: inserted, error: insertError } = await admin
      .from('models')
      .insert({
        name,
        brand_id: brandId,
        vehicle_type_id: vehicleTypeId,
        is_verified: false,
        created_by: userId,
      })
      .select('id,name,is_verified')
      .single();

    if (insertError || !inserted) {
      // Reintento en caso de conflicto de unique
      const { data: retry, error: retryError } = await admin
        .from('models')
        .select('id,name,is_verified')
        .eq('brand_id', brandId)
        .eq('name_norm', nameNorm)
        .limit(1);

      if (!retryError && retry && retry.length) {
        const found = retry[0];
        return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
      }

      const { data: retry2, error: retry2Error } = await admin
        .from('models')
        .select('id,name,is_verified')
        .eq('brand_id', brandId)
        .ilike('name', name)
        .limit(1);

      if (!retry2Error && retry2 && retry2.length) {
        const found = retry2[0];
        return { ok: true, data: { id: found.id, name: found.name, is_verified: !!(found as any).is_verified } };
      }

      return { ok: false, error: 'No pudimos crear el modelo', details: insertError?.message };
    }

    return { ok: true, data: inserted };
  } catch (error: any) {
    logError('[actions.upsertModel] error', error);
    return { ok: false, error: 'Error interno del servidor', details: error?.message };
  }
}
