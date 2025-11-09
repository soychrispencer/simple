// Script para aplicar políticas RLS híbridas a la tabla profiles
// Ejecutar con: node scripts/apply-profiles-rls-policies.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyProfilesRLSPolicies() {
  console.log('🔧 Aplicando políticas RLS híbridas a la tabla profiles...\n');

  try {
    // Políticas RLS híbridas para profiles
    const policiesSQL = `
-- Políticas RLS híbridas para profiles
DO $$
BEGIN
  -- Eliminar políticas anteriores si existen (con nombres más específicos)
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Legacy users can view their profile" ON public.profiles;
  DROP POLICY IF EXISTS "System can manage profiles" ON public.profiles;

  -- Recrear todas las políticas
  CREATE POLICY "Authenticated users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Authenticated users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Authenticated users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Legacy users can view their profile" ON public.profiles
    FOR SELECT USING (
      user_id IN (
        SELECT user_id FROM public.profiles WHERE user_id = user_id
      )
    );

  CREATE POLICY "System can manage profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');
END $$;
`;

    console.log('📋 SQL a ejecutar en Supabase:');
    console.log('='.repeat(80));
    console.log(policiesSQL.trim());
    console.log('='.repeat(80));

    console.log('\n🔗 Ve a: https://supabase.com/dashboard/project/rkejxzdufvoknhnxuusd/sql');
    console.log('📄 Copia y pega el SQL anterior, luego ejecuta la consulta.');

    // Verificar que las políticas se aplicaron (después de que el usuario las ejecute)
    console.log('\n⏳ Una vez ejecutado el SQL, presiona Enter para verificar...');

    // Esperar input del usuario
    process.stdin.once('data', async () => {
      console.log('\n🔍 Verificando políticas RLS...');

      // Probar consulta con usuario existente (usando la misma lógica que la página)
      const testUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded';
      const { data: testProfiles, error: testError } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', testUserId)
        .limit(1);

      if (testError) {
        console.error('❌ Error en consulta de prueba:', testError);
        console.log('💡 Si el error persiste, verifica que ejecutaste el SQL correctamente.');
      } else {
        const profile = testProfiles && testProfiles.length > 0 ? testProfiles[0] : null;
        console.log('✅ Consulta de prueba exitosa');
        console.log(`📊 Plan encontrado: ${profile?.plan || 'free'}`);
      }

      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

applyProfilesRLSPolicies();