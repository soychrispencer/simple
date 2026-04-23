import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkTables() {
  try {
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%serenata%'
    `);
    console.log('Tablas de serenatas encontradas:', result.map((t: any) => t.table_name).join(', '));
    
    if (result.length === 0) {
      console.log('\n❌ No hay tablas de serenatas. Necesitas correr las migraciones.');
    } else {
      console.log('\n✅ Tablas existen');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkTables();
