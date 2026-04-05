import postgres from 'postgres';
const sql = postgres('postgresql://postgres:password@localhost:5432/simplev2');

async function check() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'agenda%';
    `;
    console.log('Tablas encontradas:', tables);
    
    if (tables.some(t => t.table_name === 'agenda_appointments')) {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agenda_appointments';
      `;
      console.log('Columnas de agenda_appointments:', columns.map(c => c.column_name));
    }
  } catch (e) {
    console.error('Error al chequear tablas:', e);
  } finally {
    await sql.end();
  }
}

check();
