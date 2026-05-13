import { db } from '../src/db/index.js';
import { users, emailVerificationTokens } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

async function cleanupUsers() {
  console.log('Limpiando usuarios de prueba...\n');

  try {
    // Listar usuarios actuales
    const currentUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);

    console.log('Usuarios actuales en la base de datos:');
    console.table(currentUsers);

    if (currentUsers.length === 0) {
      console.log('\n✅ No hay usuarios para eliminar');
      process.exit(0);
    }

    // Borrar tokens de verificación primero
    await db.delete(emailVerificationTokens);
    console.log('\n🗑️ Tokens de verificación eliminados');

    // Borrar todos los usuarios locales (NO admins)
    const result = await db.delete(users).where(
      sql`${users.role} != 'admin' OR ${users.role} IS NULL`
    ).returning({ email: users.email });

    console.log(`\n✅ Eliminados ${result.length} usuarios de prueba:`);
    result.forEach(u => console.log(`   - ${u.email}`));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

cleanupUsers();
