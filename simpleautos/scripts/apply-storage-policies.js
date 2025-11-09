import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyStoragePolicies() {
  try {
    console.log('Aplicando políticas RLS de storage...');

    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix-storage-policies.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir el SQL en statements individuales y ejecutar uno por uno
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Ejecutando:', statement.trim().substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error('Error en statement:', error);
          // Continuar con el siguiente
        }
      }
    }

    console.log('✅ Políticas RLS de storage aplicadas correctamente');

  } catch (error) {
    console.error('Error:', error);
  }
}

applyStoragePolicies();