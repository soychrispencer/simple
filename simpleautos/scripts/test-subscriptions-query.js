// Script de prueba para verificar que las consultas de subscriptions funcionen
// Ejecutar con: node scripts/test-subscriptions-query.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionsQuery() {
  console.log('🧪 Probando consulta de subscriptions...\n');

  try {
    // Obtener un usuario de prueba
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error obteniendo usuarios:', usersError);
      return;
    }

    const testUser = users[0];
    console.log(`👤 Usuario de prueba: ${testUser.email} (ID: ${testUser.id})\n`);

    // Probar la consulta exacta que está fallando en el panel
    console.log('🎫 Probando consulta de suscripción activa...');
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', testUser.id)
      .eq('status', 'active')
      .single();

    if (subscriptionError) {
      if (subscriptionError.code === 'PGRST116') { // No rows returned
        console.log('✅ Consulta exitosa: No hay suscripción activa (esperado)');
      } else {
        console.error('❌ Error en consulta de suscripciones:', subscriptionError);
        console.log('💡 Esto indica que las políticas RLS no están configuradas correctamente');
      }
    } else {
      console.log(`✅ Suscripción encontrada: ${subscription.status}`);
    }

    // Verificar políticas RLS
    console.log('\n🔍 Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'subscriptions');

    if (policiesError) {
      console.error('❌ Error verificando políticas:', policiesError);
    } else {
      console.log('📋 Políticas encontradas:');
      if (policies.length === 0) {
        console.log('  ❌ No hay políticas RLS configuradas');
        console.log('  💡 Ejecuta la migración RLS primero');
      } else {
        policies.forEach(policy => {
          console.log(`  ✅ ${policy.policyname} (${policy.cmd})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSubscriptionsQuery();