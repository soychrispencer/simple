// Script de prueba completo para subscriptions
// Combina test-subscriptions-query.js, test-exact-subscription-query.js y test-browser-simulation.js
// Ejecutar con: node scripts/test-subscriptions-comprehensive.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

async function testSubscriptionsComprehensive() {
  console.log('🧪 Test completo de subscriptions...\n');

  // El usuario que sabemos que existe
  const testUserId = '7b6a926b-5e1b-41ca-aca9-a3e453a21adf'; // testuser@gmail.com
  const failingUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded'; // cspencerdrummer@gmail.com

  // Crear cliente de service role para obtener un token de usuario
  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    // Test 1: Consulta básica con service role
    console.log('🔍 Test 1: Consulta básica con service role...');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', testUserId)
      .eq('status', 'active')
      .single();

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('❌ Error con service role:', serviceError);
    } else {
      console.log('✅ Consulta básica exitosa');
    }

    // Test 2: Simulación de navegador
    console.log('\n🌐 Test 2: Simulación de navegador...');
    const browserClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('🔍 Probando consulta ANTES de la corrección (con .single())...');
    try {
      const { data: browserData, error: browserError } = await browserClient
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', testUserId)
        .eq('status', 'active')
        .single();

      if (browserError) {
        console.log('⚠️  Error esperado en navegador:', browserError.message);
      }
    } catch (e) {
      console.log('⚠️  Error esperado en navegador');
    }

    // Test 3: Consulta con usuario específico que fallaba
    console.log('\n🎫 Test 3: Consulta con usuario problemático...');
    const { data: failingData, error: failingError } = await serviceClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', failingUserId)
      .eq('status', 'active')
      .single();

    if (failingError && failingError.code !== 'PGRST116') {
      console.error('❌ Error con usuario problemático:', failingError);
    } else {
      console.log('✅ Consulta con usuario problemático exitosa');
    }

    console.log('\n📊 Tests completados');

  } catch (error) {
    console.error('❌ Error en tests:', error);
  }
}

testSubscriptionsComprehensive();