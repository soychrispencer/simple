/**
 * Migration Script: Migrate extra_specs to subtables
 * Run this script to migrate historical vehicle data from extra_specs jsonb to type-specific subtables
 * Usage: node scripts/migrate-data.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateExtraSpecs(batchSize = 100) {
  console.log('Starting migration of extra_specs to subtables...');

  let processed = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Get batch of vehicles with extra_specs
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          type_id,
          extra_specs,
          vehicle_types!inner(slug)
        `)
        .not('extra_specs', 'is', null)
        .neq('extra_specs', '{}')
        .range(processed, processed + batchSize - 1);

      if (error) {
        console.error('Error fetching vehicles:', error);
        break;
      }

      if (!vehicles || vehicles.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing batch of ${vehicles.length} vehicles...`);

      // Process each vehicle
      for (const vehicle of vehicles) {
        const typeSlug = vehicle.vehicle_types?.slug;
        const specs = vehicle.extra_specs;

        if (!typeSlug || !specs) continue;

        try {
          // Migrate based on type
          if (typeSlug === 'car') {
            await migrateCarSpecs(vehicle.id, specs);
          } else if (typeSlug === 'motorcycle') {
            await migrateMotorcycleSpecs(vehicle.id, specs);
          }
          // Add other types as needed

        } catch (err) {
          console.error(`Error migrating vehicle ${vehicle.id}:`, err);
        }
      }

      processed += vehicles.length;
      console.log(`Processed ${processed} vehicles so far...`);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error('Batch processing error:', err);
      break;
    }
  }

  console.log(`Migration completed. Total processed: ${processed}`);
}

async function migrateCarSpecs(vehicleId, specs) {
  const carData = {
    vehicle_id: vehicleId,
    doors: specs.doors ? parseInt(specs.doors) : null,
    body_type: specs.body_type || null,
    drivetrain: specs.drivetrain || null,
    transmission: specs.transmission || null,
    fuel_type: specs.fuel_type || null,
    engine: specs.engine || null,
    version: specs.version || null,
    owners_count: specs.owners_count ? parseInt(specs.owners_count) : null,
    power: specs.power || null,
    fuel_consumption: specs.fuel_consumption || null,
    warranty: specs.warranty || null,
  };

  const { error } = await supabase
    .from('vehicle_cars')
    .upsert(carData, { onConflict: 'vehicle_id' });

  if (error) throw error;
}

async function migrateMotorcycleSpecs(vehicleId, specs) {
  const motorcycleData = {
    vehicle_id: vehicleId,
    displacement_cc: specs.displacement_cc ? parseInt(specs.displacement_cc) : null,
    engine_type: specs.engine_type || null,
    cooling: specs.cooling || null,
    transmission_type: specs.transmission_type || null,
    fuel_type: specs.fuel_type || null,
    power: specs.power || null,
    torque: specs.torque || null,
    dry_weight: specs.dry_weight ? parseInt(specs.dry_weight) : null,
  };

  const { error } = await supabase
    .from('vehicle_motorcycles')
    .upsert(motorcycleData, { onConflict: 'vehicle_id' });

  if (error) throw error;
}

// Run migration
migrateExtraSpecs()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });