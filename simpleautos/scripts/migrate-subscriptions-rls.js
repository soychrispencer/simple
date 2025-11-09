// Script para verificar y aplicar políticas RLS de subscriptions
// Ejecutar con: node scripts/migrate-subscriptions-rls.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSStatus() {
  console.log('� Verificando estado RLS de la tabla subscriptions...\n');

  try {
    // Verificar si RLS está habilitado
    const { data: rlsEnabled, error: rlsError } = await supabase
      .rpc('check_rls_enabled', { table_name: 'subscriptions' });

    if (rlsError) {
      console.log('⚠️  No se pudo verificar RLS automáticamente. Necesitas ejecutar el SQL manualmente.');
      console.log('\n📋 Instrucciones:');
      console.log('1. Ve a https://supabase.com/dashboard/project/rkejxzdufvoknhnxuusd/sql');
      console.log('2. Copia y pega el contenido del archivo: supabase/migrations/20251018190000_fix_subscriptions_rls.sql');
      console.log('3. Ejecuta el script');
      console.log('\n📄 Contenido del script a ejecutar:');

      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251018190000_fix_subscriptions_rls.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log('\n' + '='.repeat(80));
      console.log(migrationSQL);
      console.log('='.repeat(80));

      return;
    }

    console.log(`🔒 RLS habilitado: ${rlsEnabled}`);

    // Verificar políticas existentes
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'subscriptions');

    if (policiesError) {
      console.error('❌ Error verificando políticas:', policiesError);
    } else {
      console.log('📋 Políticas actuales:');
      if (policies.length === 0) {
        console.log('  - Ninguna política encontrada');
      } else {
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkRLSStatus();