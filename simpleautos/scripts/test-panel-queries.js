// Script de prueba para verificar las consultas del panel
// Ejecutar con: node scripts/test-panel-queries.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQueries() {
  console.log('🧪 Probando consultas del panel...\n');

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

    // Probar consulta de publicaciones activas
    console.log('📊 Probando consulta de publicaciones activas...');
    const { count: totalCount, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', testUser.id)
      .eq('status', 'active')
      .not('published_at', 'is', null);

    if (countError) {
      console.error('❌ Error en consulta de publicaciones:', countError);
    } else {
      console.log(`✅ Publicaciones activas: ${totalCount || 0}`);
    }

    // Probar consulta de ventas
    console.log('💰 Probando consulta de ventas...');
    const { count: salesCount, error: salesError } = await supabase
      .from('vehicle_sales')
      .select('*', { count: 'exact', head: true })
      .eq('seller_profile_id', testUser.id);

    if (salesError) {
      console.error('❌ Error en consulta de ventas:', salesError);
    } else {
      console.log(`✅ Total ventas: ${salesCount || 0}`);
    }

    // Probar consulta de suscripciones
    console.log('🎫 Probando consulta de suscripciones...');
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', testUser.id)
      .eq('status', 'active')
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error en consulta de suscripciones:', subscriptionError);
    } else {
      const planActive = !subscriptionError && subscription?.status === 'active';
      console.log(`✅ Plan activo: ${planActive}`);
    }

    console.log('\n🎉 Pruebas completadas!');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testQueries();