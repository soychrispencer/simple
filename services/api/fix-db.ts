import { sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';

async function main() {
  try {
    await db.execute(sql.raw('ALTER TABLE serenata_musicians ADD COLUMN IF NOT EXISTS instruments VARCHAR(255)[]'));
    console.log('✅ Columna instruments agregada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
