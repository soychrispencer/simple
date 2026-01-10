#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const APPLY_CHANGES = process.argv.includes('--apply');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LEGACY_SLOT_KEY_MAP = {
  home_main: 'home_main',
  home_slider: 'home_main',
  home_featured: 'home_main',
  venta_tab: 'venta_tab',
  venta_list: 'venta_tab',
  arriendo_tab: 'arriendo_tab',
  arriendo_list: 'arriendo_tab',
  rent_tab: 'arriendo_tab',
  subasta_tab: 'subasta_tab',
  auction_tab: 'subasta_tab',
  user_page: 'user_page',
  profile: 'user_page',
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Debes definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar este script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function chunk(array, size = 100) {
  const items = Array.from(array);
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function normalizeSlotKey(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase();
  return LEGACY_SLOT_KEY_MAP[key] || key;
}

function mapLegacyStatus(row) {
  if (!row) return 'pending';
  const status = row.status || '';
  if (status === 'active') {
    return row.is_active ? 'active' : 'ended';
  }
  if (status === 'expired') {
    return 'ended';
  }
  if (status === 'cancelled') {
    return 'cancelled';
  }
  return row.is_active ? 'active' : 'pending';
}

async function fetchVehiclesVerticalId() {
  const { data, error } = await supabase
    .from('verticals')
    .select('id')
    .eq('key', 'vehicles')
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo vertical vehicles: ${error.message}`);
  }
  return data?.id || null;
}

async function fetchSlotMap(verticalId) {
  const { data, error } = await supabase
    .from('boost_slots')
    .select('id, key')
    .eq('vertical_id', verticalId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Error cargando boost_slots: ${error.message}`);
  }

  const map = new Map();
  (data || []).forEach((slot) => {
    map.set(slot.key, slot.id);
  });
  return map;
}

async function fetchLegacyBoosts() {
  const { data, error } = await supabase.from('vehicle_boosts').select('*');
  if (error) {
    if (error.message?.includes('Could not find the table')) {
      return [];
    }
    throw new Error(`Error leyendo vehicle_boosts: ${error.message}`);
  }
  return data || [];
}

async function fetchLegacySlotAssignments() {
  const { data, error } = await supabase.from('vehicle_boost_slots').select('*');
  if (error) {
    if (error.message?.includes('Could not find the table')) {
      return [];
    }
    throw new Error(`Error leyendo vehicle_boost_slots: ${error.message}`);
  }
  return data || [];
}

async function loadListingOwners(listingIds) {
  const map = new Map();
  const uniqueIds = Array.from(new Set(listingIds.filter(Boolean)));
  for (const batch of chunk(uniqueIds, 100)) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, user_id, company_id')
      .in('id', batch);
    if (error) {
      throw new Error(`Error obteniendo owners para listings (${batch.length}): ${error.message}`);
    }
    (data || []).forEach((listing) => {
      map.set(listing.id, listing);
    });
  }
  return map;
}

async function upsertListingBoost(listing, boostRow) {
  const metadata = {
    legacy_source: 'vehicle_boosts',
    legacy_boost_id: boostRow.id,
    legacy_plan_id: boostRow.plan_id,
    legacy_status: boostRow.status,
  };

  const payload = {
    listing_id: listing.id,
    company_id: listing.company_id,
    user_id: listing.user_id,
    status: mapLegacyStatus(boostRow),
    starts_at: boostRow.start_date,
    ends_at: boostRow.end_date,
    metadata,
  };

  const { data: existing, error: existingError } = await supabase
    .from('listing_boosts')
    .select('id, metadata')
    .eq('metadata->>legacy_boost_id', boostRow.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Error revisando boost existente (${boostRow.id}): ${existingError.message}`);
  }

  if (existing?.id) {
    const mergedMetadata = { ...(existing.metadata || {}), ...metadata };
    const { data, error } = await supabase
      .from('listing_boosts')
      .update({ ...payload, metadata: mergedMetadata })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) {
      throw new Error(`Error actualizando listing_boost ${existing.id}: ${error.message}`);
    }
    return data.id;
  }

  const { data, error } = await supabase
    .from('listing_boosts')
    .insert(payload)
    .select('id')
    .single();
  if (error) {
    throw new Error(`Error creando listing_boost para ${listing.id}: ${error.message}`);
  }
  return data.id;
}

async function syncSlotsForBoost({ listingId, boostId, slotIds, startsAt, endsAt }) {
  const normalized = Array.from(new Set(slotIds.filter(Boolean)));
  if (!normalized.length) {
    return { added: 0, removed: 0 };
  }

  const { data: currentRows, error } = await supabase
    .from('listing_boost_slots')
    .select('id, slot_id')
    .eq('boost_id', boostId)
    .eq('listing_id', listingId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Error leyendo listing_boost_slots para boost ${boostId}: ${error.message}`);
  }

  const current = currentRows || [];
  const currentSlotIds = current.map((row) => row.slot_id);
  const toAdd = normalized.filter((slotId) => !currentSlotIds.includes(slotId));
  const toRemove = current.filter((row) => !normalized.includes(row.slot_id));

  let added = 0;
  let removed = 0;

  if (toRemove.length) {
    const { error: deactivateError } = await supabase
      .from('listing_boost_slots')
      .update({ is_active: false, ends_at: endsAt || new Date().toISOString() })
      .in('id', toRemove.map((row) => row.id));
    if (deactivateError) {
      throw new Error(`Error desactivando slots legacy: ${deactivateError.message}`);
    }
    removed = toRemove.length;
  }

  if (toAdd.length) {
    const payload = toAdd.map((slotId) => ({
      boost_id: boostId,
      slot_id: slotId,
      listing_id: listingId,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || null,
      is_active: true,
    }));
    const { error: insertError } = await supabase.from('listing_boost_slots').insert(payload);
    if (insertError) {
      throw new Error(`Error agregando slots legacy: ${insertError.message}`);
    }
    added = payload.length;
  }

  return { added, removed };
}

async function main() {
  console.log(`🚀 Migración de vehicle_boosts → listing_boosts (${APPLY_CHANGES ? 'modo APPLY' : 'dry-run'})`);

  const vehiclesVerticalId = await fetchVehiclesVerticalId();
  if (!vehiclesVerticalId) {
    console.warn('⚠️ No existe vertical "vehicles". No se puede continuar.');
    return;
  }

  const slotMap = await fetchSlotMap(vehiclesVerticalId);
  if (!slotMap.size) {
    console.warn('⚠️ No hay registros en boost_slots para vehicles. Abortando.');
    return;
  }

  const [legacyBoosts, legacySlotRows] = await Promise.all([
    fetchLegacyBoosts(),
    fetchLegacySlotAssignments(),
  ]);

  if (!legacyBoosts.length) {
    console.log('✅ No se encontraron registros en vehicle_boosts. Nada que migrar.');
    return;
  }

  const listingMap = await loadListingOwners(legacyBoosts.map((boost) => boost.vehicle_id));
  const slotsByVehicle = new Map();
  legacySlotRows.forEach((row) => {
    const key = normalizeSlotKey(row.slot_type);
    if (!key) return;
    if (!slotsByVehicle.has(row.vehicle_id)) {
      slotsByVehicle.set(row.vehicle_id, []);
    }
    slotsByVehicle.get(row.vehicle_id).push(key);
  });

  const summary = [];
  for (const boost of legacyBoosts) {
    const listing = listingMap.get(boost.vehicle_id);
    if (!listing) {
      summary.push({
        legacyBoostId: boost.id,
        listingId: boost.vehicle_id,
        status: 'skipped',
        reason: 'listing_not_found',
      });
      continue;
    }

    const slotKeys = Array.from(new Set(slotsByVehicle.get(boost.vehicle_id) || []));
    const slotIds = [];
    const missingSlots = [];
    slotKeys.forEach((key) => {
      const slotId = slotMap.get(key);
      if (slotId) {
        slotIds.push(slotId);
      } else {
        missingSlots.push(key);
      }
    });

    if (!APPLY_CHANGES) {
      summary.push({
        legacyBoostId: boost.id,
        listingId: listing.id,
        slotCount: slotIds.length,
        missingSlots,
        mode: 'dry-run',
        nextStatus: mapLegacyStatus(boost),
      });
      continue;
    }

    try {
      const newBoostId = await upsertListingBoost(listing, boost);
      const slotResult = await syncSlotsForBoost({
        listingId: listing.id,
        boostId: newBoostId,
        slotIds,
        startsAt: boost.start_date,
        endsAt: boost.end_date,
      });
      summary.push({
        legacyBoostId: boost.id,
        listingId: listing.id,
        slotCount: slotIds.length,
        slotsAdded: slotResult.added,
        slotsRemoved: slotResult.removed,
        missingSlots,
        status: 'migrated',
      });
    } catch (error) {
      summary.push({
        legacyBoostId: boost.id,
        listingId: listing.id,
        status: 'error',
        message: error.message,
      });
    }
  }

  const migrated = summary.filter((item) => item.status === 'migrated').length;
  const skipped = summary.filter((item) => item.status === 'skipped').length;
  const errors = summary.filter((item) => item.status === 'error');

  console.log('--- Resumen ---');
  console.log(`Total boosts legacy: ${legacyBoosts.length}`);
  console.log(`Migrados: ${migrated}`);
  console.log(`Saltados: ${skipped}`);
  console.log(`Errores: ${errors.length}`);

  if (!APPLY_CHANGES) {
    console.log('\nModo dry-run: agrega --apply para ejecutar los cambios.');
  }

  if (skipped) {
    console.log('\nDetalles de skips:');
    summary
      .filter((item) => item.status === 'skipped')
      .forEach((item) => {
        console.log(`- Boost ${item.legacyBoostId}: ${item.reason}`);
      });
  }

  if (errors.length) {
    console.log('\nErrores:');
    errors.forEach((item) => {
      console.log(`- Boost ${item.legacyBoostId}: ${item.message}`);
    });
  }

  const unknownSlots = summary.filter((item) => item.missingSlots?.length);
  if (unknownSlots.length) {
    console.log('\nSlots sin mapping:');
    unknownSlots.forEach((item) => {
      console.log(`- Boost ${item.legacyBoostId}: ${item.missingSlots.join(', ')}`);
    });
  }
}

main().catch((error) => {
  console.error('❌ Error general en migración:', error);
  process.exit(1);
});
