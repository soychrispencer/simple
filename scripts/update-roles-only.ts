import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../services/api/src/db/schema';
import { eq } from 'drizzle-orm';

const client = postgres('postgresql://postgres:password@localhost:5432/simplev2');
const db = drizzle(client);

async function updateRoles() {
  // Actualizar cliente
  await db.update(users).set({ role: 'client' }).where(eq(users.email, 'cliente@simpleserenatas.app'));
  console.log('✅ Cliente: cliente@simpleserenatas.app → role: client');

  // Actualizar músico
  await db.update(users).set({ role: 'musician' }).where(eq(users.email, 'musico@simpleserenatas.app'));
  console.log('✅ Músico: musico@simpleserenatas.app → role: musician');

  // Actualizar coordinador (base musician)
  await db.update(users).set({ role: 'musician' }).where(eq(users.email, 'coordinador@simpleserenatas.app'));
  console.log('✅ Coordinador: coordinador@simpleserenatas.app → role: musician (base)');

  await client.end();
  console.log('\n🎉 Roles actualizados. Ahora puedes iniciar sesión con cualquier cuenta.');
}

updateRoles().catch(console.error);
