// Script para simular exactamente lo que hace el navegador
// Ejecutar con: node scripts/test-browser-simulation.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

async function simulateBrowserQuery() {
  console.log('🌐 Simulando consulta del navegador...\n');

  // El usuario que sabemos que existe
  const testUserId = '7b6a926b-5e1b-41ca-aca9-a3e453a21adf'; // testuser@gmail.com
  const failingUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded'; // cspencerdrummer@gmail.com

  // Crear cliente de service role para obtener un token de usuario
  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    // Probar con el usuario que sabemos que existe en auth
    console.log('🔍 Probando con usuario válido en auth...');

    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(testUserId);

    if (userError) {
      console.error('❌ Error obteniendo usuario de prueba:', userError);
      return;
    }

    console.log(`👤 Usuario de prueba: ${userData.user.email}\n`);

    // Crear un cliente anónimo (como el navegador)
    const browserClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('🔍 Probando consulta ANTES de la corrección (con .single())...');
    try {
      const { data: subscription, error: subscriptionError } = await browserClient
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', testUserId)
        .eq('status', 'active')
        .single();

      if (subscriptionError) {
        console.log(`❌ Error (esperado cuando no hay suscripción): ${subscriptionError.message} (código: ${subscriptionError.code})`);
      } else {
        console.log('✅ Suscripción encontrada:', subscription);
      }
    } catch (error) {
      console.log('❌ Error de red:', error.message);
    }

    console.log('\n🔍 Probando consulta DESPUÉS de la corrección (sin .single())...');
    try {
      const { data: subscriptions, error: subscriptionError } = await browserClient
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', testUserId)
        .eq('status', 'active')
        .limit(1);

      if (subscriptionError) {
        console.log(`❌ Error: ${subscriptionError.message} (código: ${subscriptionError.code})`);
      } else {
        const planActive = subscriptions && subscriptions.length > 0 && subscriptions[0].status === 'active';
        console.log(`✅ Consulta exitosa. Plan activo: ${planActive}`);
        console.log(`📊 Suscripciones encontradas: ${subscriptions.length}`);
      }
    } catch (error) {
      console.log('❌ Error de red:', error.message);
    }

    console.log('\n🔍 Verificando el problema con el usuario original...');
    console.log(`👤 Usuario problemático: ${failingUserId}`);

    // Verificar si el usuario problemático existe en profiles pero no en auth
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', failingUserId)
      .single();

    if (profileError) {
      console.log('❌ Usuario no existe en profiles');
    } else {
      console.log('✅ Usuario existe en profiles:', profile.email);

      // Verificar si existe en auth
      try {
        const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(failingUserId);
        if (authError) {
          console.log('❌ Usuario NO existe en auth system - ¡Este es el problema!');
          console.log('💡 El usuario está en la tabla profiles pero no está registrado en Supabase Auth');
          console.log('🔧 Solución: El usuario necesita registrarse/login correctamente en Supabase Auth');
        } else {
          console.log('✅ Usuario también existe en auth');
        }
      } catch (authCheckError) {
        console.log('❌ Error verificando auth:', authCheckError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

simulateBrowserQuery();