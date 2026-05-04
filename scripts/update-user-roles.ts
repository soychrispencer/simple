import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, serenataMusicians, serenataCoordinatorProfiles } from '../services/api/src/db/schema';
import { eq } from 'drizzle-orm';

const client = postgres('postgresql://postgres:password@localhost:5432/simplev2');
const db = drizzle(client);

async function updateRoles() {
  // Actualizar cliente
  await db.update(users).set({ role: 'client' }).where(eq(users.email, 'cliente@simpleserenatas.app'));
  console.log('✅ Cliente actualizado');

  // Actualizar músico
  await db.update(users).set({ role: 'musician' }).where(eq(users.email, 'musico@simpleserenatas.app'));
  
  // Crear perfil de músico
  const musicoUser = await db.select().from(users).where(eq(users.email, 'musico@simpleserenatas.app'));
  if (musicoUser.length > 0) {
    await db.insert(serenataMusicians).values({
      userId: musicoUser[0].id,
      instrument: 'Guitarra',
      experience: 5,
      bio: 'Músico profesional de prueba',
    }).onConflictDoNothing();
    console.log('✅ Músico actualizado y perfil creado');
  }

  // Actualizar coordinador
  await db.update(users).set({ role: 'musician' }).where(eq(users.email, 'coordinador@simpleserenatas.app'));
  
  // Crear perfil de coordinador
  const coordUser = await db.select().from(users).where(eq(users.email, 'coordinador@simpleserenatas.app'));
  if (coordUser.length > 0) {
    await db.insert(serenataCoordinatorProfiles).values({
      userId: coordUser[0].id,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      city: 'Santiago',
      region: 'RM',
    }).onConflictDoNothing();
    console.log('✅ Coordinador actualizado y perfil creado');
  }

  await client.end();
  console.log('\n🎉 Todos los usuarios configurados correctamente');
}

updateRoles().catch(console.error);
