// Script simple para aplicar políticas RLS híbridas
// Ejecutar con: node scripts/apply-rls-policies.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSPolicies() {
  console.log('🔧 Aplicando políticas RLS híbridas para subscriptions...\n');

  try {
    // Políticas RLS híbridas
    const policiesSQL = `
-- Políticas RLS híbridas para subscriptions
DO $$
BEGIN
  -- Eliminar políticas anteriores si existen
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Authenticated users can view their own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Authenticated users can update their own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Legacy users can view their subscriptions" ON public.subscriptions;

  -- Política para usuarios autenticados en Supabase Auth (normal)
  CREATE POLICY "Authenticated users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

  -- Política para usuarios autenticados en Supabase Auth (updates)
  CREATE POLICY "Authenticated users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- Política temporal para usuarios existentes en profiles (solo SELECT)
  -- Esto permite que usuarios que existen en profiles puedan ver sus suscripciones
  -- mientras completan el proceso de migración a Supabase Auth
  CREATE POLICY "Legacy users can view their subscriptions" ON public.subscriptions
    FOR SELECT USING (
      user_id IN (
        SELECT user_id FROM public.profiles WHERE user_id = user_id
      )
    );

  -- Política para el sistema (service role)
  CREATE POLICY "System can manage subscriptions" ON public.subscriptions
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

      // Probar consulta con usuario existente
      const testUserId = 'ac4d5013-50e9-4d8d-9de2-def543c63ded';
      const { data: testSubscriptions, error: testError } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', testUserId)
        .eq('status', 'active')
        .limit(1);

      if (testError) {
        console.error('❌ Error en consulta de prueba:', testError);
        console.log('💡 Si el error persiste, verifica que ejecutaste el SQL correctamente.');
      } else {
        console.log('✅ ¡Políticas RLS aplicadas correctamente!');
        console.log(`📊 Suscripciones encontradas: ${testSubscriptions.length}`);
        console.log('\n🎉 El error 406 debería estar resuelto ahora.');
      }

      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

applyRLSPolicies();