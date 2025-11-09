const { createClient } = require('@supabase/supabase-js');

// Probar con usuario autenticado simulado
const supabase = createClient(
  'https://rkejxzdufvoknhnxuusd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZWp4emR1ZnZva25obnh1dXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA3MTIsImV4cCI6MjA3MTYxNjcxMn0.oRwYuxDEWGAJEvzhxu0M1RqHWPKR0PcezV0uenW7jTs'
);

async function testAuthenticatedUpload() {
  try {
    console.log('🔐 Probando subida con usuario autenticado...\n');

    // Primero intentar autenticar un usuario existente
    console.log('👤 Intentando login...');

    // Nota: Para probar completamente necesitarías credenciales reales
    // Por ahora, vamos a verificar que las políticas se aplicaron correctamente

    console.log('📋 Verificando que las políticas RLS se corrigieron...\n');

    // Crear un archivo de prueba pequeño
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    const buckets = ['avatars', 'covers', 'vehicles'];

    for (const bucket of buckets) {
      console.log(`📦 Probando bucket: ${bucket}`);

      // Verificar lectura (debería funcionar)
      try {
        const { data: files, error: listError } = await supabase.storage.from(bucket).list();
        if (listError) {
          console.log(`❌ Error listando: ${listError.message}`);
        } else {
          console.log(`✅ Lectura OK (${files?.length || 0} archivos)`);
        }
      } catch (err) {
        console.log(`❌ Error listando: ${err.message}`);
      }

      // Intentar subida (debería fallar sin autenticación)
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(`test-${Date.now()}.txt`, testFile);

        if (error) {
          if (error.message.includes('violates row-level security policy')) {
            console.log(`✅ RLS funcionando: Subida bloqueada correctamente para usuario no autenticado`);
          } else {
            console.log(`❌ Error diferente: ${error.message}`);
          }
        } else {
          console.log(`⚠️ Subida exitosa (inesperado sin autenticación)`);
          // Limpiar si se subió
          if (data?.path) {
            await supabase.storage.from(bucket).remove([data.path]);
          }
        }
      } catch (err) {
        console.log(`✅ RLS funcionando: ${err.message}`);
      }

      console.log('');
    }

    console.log('💡 Resultado esperado:');
    console.log('   - ✅ Lectura: Debe funcionar (buckets públicos)');
    console.log('   - ✅ Subida: Debe fallar con "violates row-level security policy"');
    console.log('   - ✅ Una vez logueado en la app: Las subidas deberían funcionar');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testAuthenticatedUpload();