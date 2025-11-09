const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://rkejxzdufvoknhnxuusd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZWp4emR1ZnZva25obnh1dXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0MDcxMiwiZXhwIjoyMDcxNjE2NzEyfQ.CwqTG_gcP_bg2VG50HK_Z5yk3fq25JJUFD-Ezu_CYyI'
);

async function createStorageBuckets() {
  try {
    console.log('🪣 Creando buckets de storage y políticas RLS...\n');

    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('./scripts/create-storage-buckets.sql', 'utf8');

    // Dividir en statements individuales (por punto y coma)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Ejecutando ${statements.length} statements SQL...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Ejecutando statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });

          if (error) {
            console.log(`❌ Error en statement ${i + 1}:`, error.message);
            // Continuar con el siguiente statement
          } else {
            console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
          }
        } catch (err) {
          console.log(`❌ Error ejecutando statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n🔍 Verificando buckets creados...');

    // Verificar buckets
    const { data: buckets, error: bucketsError } = await supabase
      .from('storage.buckets')
      .select('id, name, public, file_size_limit')
      .in('id', ['avatars', 'covers', 'vehicles']);

    if (bucketsError) {
      console.log('❌ Error verificando buckets:', bucketsError.message);
    } else {
      console.log('✅ Buckets encontrados:');
      buckets?.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'}, límite: ${bucket.file_size_limit} bytes)`);
      });
    }

    console.log('\n🎉 Proceso completado! Los buckets de storage están configurados.');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

createStorageBuckets();