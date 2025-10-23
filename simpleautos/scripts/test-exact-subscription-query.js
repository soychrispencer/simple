// Script para probar la consulta exacta que está fallando
// Ejecutar con: node scripts/test-exact-subscription-query.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

// Crear cliente con la clave anónima (como en el navegador)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testExactQuery() {
  console.log('🧪 Probando la consulta exacta que falla en el navegador...\n');

  // El user ID del error: ac4d5013-50e9-4d8d-9de2-def543c63ded
  const failingUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded';

  console.log(`👤 Probando con user_id: ${failingUserId}\n`);

  try {
    // Intentar hacer login primero para obtener un token válido
    console.log('🔐 Intentando autenticación...');

    // Como no tenemos credenciales del usuario, vamos a probar con service role
    const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Probando consulta con service role (debería funcionar)...');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', failingUserId)
      .eq('status', 'active')
      .single();

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('❌ Error con service role:', serviceError);
    } else {
      console.log('✅ Service role funciona correctamente');
    }

    // Ahora probar con un usuario autenticado simulado
    console.log('\n🔍 Probando consulta con usuario autenticado...');

    // Crear un cliente con un token simulado (esto debería fallar si RLS no está bien)
    // Primero vamos a verificar si hay algún usuario en la base de datos
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError);
      return;
    }

    console.log('👥 Usuarios encontrados:');
    profiles.forEach(profile => {
      console.log(`  - ${profile.email} (${profile.id})`);
    });

    // Verificar si el usuario problemático existe
    const targetUser = profiles.find(p => p.id === failingUserId);
    if (!targetUser) {
      console.log(`\n⚠️  El usuario ${failingUserId} no existe en la base de datos`);
      console.log('💡 Esto podría explicar por qué la consulta falla');
    } else {
      console.log(`\n✅ El usuario ${failingUserId} existe: ${targetUser.email}`);
    }

    // Verificar si hay suscripciones para este usuario
    const { data: subscriptions, error: subsError } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', failingUserId);

    if (subsError) {
      console.error('❌ Error obteniendo suscripciones:', subsError);
    } else {
      console.log(`📊 Suscripciones encontradas para el usuario: ${subscriptions.length}`);
      subscriptions.forEach(sub => {
        console.log(`  - Status: ${sub.status}, Period end: ${sub.current_period_end}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testExactQuery();