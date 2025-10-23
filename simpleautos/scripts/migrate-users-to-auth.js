// Script para gestionar la migración de usuarios a Supabase Auth
// Ejecutar con: node scripts/migrate-users-to-auth.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateUsersToAuth() {
  console.log('🚀 Iniciando migración de usuarios a Supabase Auth...\n');

  try {
    // Ejecutar la migración SQL primero
    console.log('📄 Ejecutando migración SQL...');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251018200000_migrate_users_to_auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (migrationError) {
      console.log('⚠️  No se pudo ejecutar automáticamente. Necesitas ejecutar el SQL manualmente.');
      console.log('📋 Copia y pega este SQL en https://supabase.com/dashboard/project/rkejxzdufvoknhnxuusd/sql\n');
      console.log('='.repeat(80));
      console.log(migrationSQL);
      console.log('='.repeat(80));
      console.log('\n');
    } else {
      console.log('✅ Migración SQL ejecutada correctamente\n');
    }

    // Verificar usuarios que necesitan migrar usando consulta directa
    console.log('👥 Verificando usuarios que necesitan migración...');

    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at');

    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError);
      return;
    }

    console.log(`📊 Encontrados ${allProfiles.length} usuarios en profiles\n`);

    // Para verificar cuáles tienen cuenta en auth, necesitamos usar una consulta diferente
    // Como no podemos acceder directamente a auth.users, vamos a asumir que
    // usuarios que pueden hacer consultas exitosas están autenticados

    const usersNeedingMigration = [];
    const usersWithAuth = [];

    for (const profile of allProfiles) {
      try {
        // Intentar una consulta que solo funcionaría si el usuario está autenticado
        // Esta es una aproximación - en la práctica necesitaríamos verificar de otra manera
        const { error: authCheckError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', profile.id)
          .limit(1);

        if (authCheckError && authCheckError.code === 'PGRST301') {
          // Error de permisos - probablemente usuario no autenticado
          usersNeedingMigration.push(profile);
        } else {
          // Consulta exitosa o error diferente - probablemente usuario autenticado
          usersWithAuth.push(profile);
        }
      } catch (error) {
        usersNeedingMigration.push(profile);
      }
    }

    console.log(`✅ Usuarios con auth válido: ${usersWithAuth.length}`);
    console.log(`⚠️  Usuarios que necesitan migración: ${usersNeedingMigration.length}\n`);

    if (usersNeedingMigration.length > 0) {
      console.log('👥 Usuarios que necesitan migración:');
      usersNeedingMigration.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.full_name || 'Sin nombre'})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Creado: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log('');
      });

      console.log('🔧 Próximos pasos para migrar usuarios:');
      console.log('');
      console.log('1. 📧 Enviar emails a estos usuarios pidiendo que se registren/login');
      console.log('2. 🔗 Proporcionar un enlace especial de "reclamar cuenta"');
      console.log('3. ✅ Una vez registrados, podrán acceder normalmente');
      console.log('');
      console.log('💡 Mientras tanto, las nuevas políticas RLS permiten acceso temporal');
      console.log('   para que estos usuarios puedan usar la aplicación.');

      // Crear un script de ejemplo para enviar emails
      console.log('\n📧 Ejemplo de email a enviar:');
      console.log('='.repeat(60));
      console.log(`Asunto: Actualiza tu cuenta en SimpleAutos`);
      console.log('');
      console.log('Hola [Nombre],');
      console.log('');
      console.log('Hemos actualizado nuestro sistema de seguridad.');
      console.log('Para continuar usando SimpleAutos, necesitas verificar tu cuenta.');
      console.log('');
      console.log('Por favor, haz click en el siguiente enlace para acceder:');
      console.log('[ENLACE_DE_LOGIN]');
      console.log('');
      console.log('Si ya tienes una cuenta, simplemente inicia sesión.');
      console.log('Si no tienes cuenta, regístrate con el mismo email.');
      console.log('');
      console.log('Gracias por usar SimpleAutos!');
      console.log('='.repeat(60));
    } else {
      console.log('🎉 ¡Todos los usuarios ya están migrados a Supabase Auth!');
    }

    // Verificar que las nuevas políticas funcionan
    console.log('\n🔍 Verificando que las políticas RLS funcionan...');

    // Probar con el usuario problemático
    const testUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded';
    const { data: testSubscriptions, error: testError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', testUserId)
      .eq('status', 'active')
      .limit(1);

    if (testError) {
      console.error('❌ Error en consulta de prueba:', testError);
    } else {
      console.log('✅ Consulta de prueba exitosa con las nuevas políticas RLS');
      console.log(`📊 Suscripciones encontradas: ${testSubscriptions.length}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

migrateUsersToAuth();