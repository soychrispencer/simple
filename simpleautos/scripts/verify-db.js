const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rkejxzdufvoknhnxuusd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZWp4emR1ZnZva25obnh1dXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0MDcxMiwiZXhwIjoyMDcxNjE2NzEyfQ.CwqTG_gcP_bg2VG50HK_Z5yk3fq25JJUFD-Ezu_CYyI'
);

async function checkTables() {
  try {
    console.log('🔍 Verificando estado de las tablas...\n');

    const tables = [
      'profiles',
      'vehicles',
      'vehicle_types',
      'brands',
      'models',
      'commercial_conditions',
      'vehicle_media',
      'vehicle_metrics',
      'vehicle_boosts',
      'boost_plans',
      'payments',
      'subscriptions',
      'notifications'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: Error - ${error.message}`);
        } else {
          console.log(`✅ ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Error de conexión - ${err.message}`);
      }
    }

    console.log('\n📊 Verificando tipos personalizados...');

    // Verificar tipos consultando una tabla que los usa
    try {
      const { data: sampleVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('status, condition')
        .limit(1);

      if (vehicleError) {
        console.log('❌ Error consultando vehicles:', vehicleError.message);
      } else {
        console.log('✅ Tipos personalizados: OK (vehicles.status y vehicles.condition existen)');
      }
    } catch (err) {
      console.log('❌ Error verificando tipos:', err.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkTables();