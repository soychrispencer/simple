#!/usr/bin/env tsx
/**
 * Script de migración: Divide admin@simpleplataforma.app en cuentas por vertical
 * 
 * Este script:
 * 1. Crea admin@simpleautos.app y admin@simplepropiedades.app
 * 2. Migra publicaciones de autos a admin@simpleautos.app
 * 3. Crea perfiles públicos para las nuevas cuentas
 * 4. Mantiene admin@simpleplataforma.app para uso administrativo
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { users, listings, listingDrafts, publicProfiles } from '../src/db/schema.js';
import { randomUUID } from 'crypto';

// Variables de entorno deben estar configuradas antes de ejecutar
// DATABASE_URL debe estar definida en el entorno

const ADMIN_OLD_EMAIL = 'admin@simpleplataforma.app';
const ADMIN_AUTOS_EMAIL = 'admin@simpleautos.app';
const ADMIN_PROPIEDADES_EMAIL = 'admin@simplepropiedades.app';

interface MigrationResult {
  oldUserId: string | null;
  autosUserId: string | null;
  propiedadesUserId: string | null;
  listingsMigrated: number;
  draftsMigrated: number;
  profilesCreated: number;
}

async function migrateAdminAccounts(): Promise<MigrationResult> {
  const result: MigrationResult = {
    oldUserId: null,
    autosUserId: null,
    propiedadesUserId: null,
    listingsMigrated: 0,
    draftsMigrated: 0,
    profilesCreated: 0,
  };

  // Conectar a la base de datos
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment variables');
  }
  
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  console.log('🔍 Verificando usuario existente...');

  // 1. Buscar usuario admin@simpleplataforma.app
  const oldUserResult = await db
    .select({ id: users.id, passwordHash: users.passwordHash, name: users.name })
    .from(users)
    .where(eq(users.email, ADMIN_OLD_EMAIL))
    .limit(1);

  if (oldUserResult.length === 0) {
    throw new Error(`Usuario ${ADMIN_OLD_EMAIL} no encontrado`);
  }

  const oldUser = oldUserResult[0];
  result.oldUserId = oldUser.id;
  console.log(`✅ Usuario encontrado: ${oldUser.id}`);

  // 2. Verificar que los nuevos usuarios no existan
  const existingAutos = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_AUTOS_EMAIL))
    .limit(1);

  const existingPropiedades = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_PROPIEDADES_EMAIL))
    .limit(1);

  if (existingAutos.length > 0) {
    console.log(`⚠️  Usuario ${ADMIN_AUTOS_EMAIL} ya existe, saltando creación`);
    result.autosUserId = existingAutos[0].id;
  }

  if (existingPropiedades.length > 0) {
    console.log(`⚠️  Usuario ${ADMIN_PROPIEDADES_EMAIL} ya existe, saltando creación`);
    result.propiedadesUserId = existingPropiedades[0].id;
  }

  // 3. Crear nuevos usuarios si no existen
  const now = new Date();

  if (!result.autosUserId) {
    console.log(`🆕 Creando usuario ${ADMIN_AUTOS_EMAIL}...`);
    result.autosUserId = randomUUID();
    
    await db.insert(users).values({
      id: result.autosUserId,
      email: ADMIN_AUTOS_EMAIL,
      passwordHash: oldUser.passwordHash,
      name: 'SimpleAutos',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Usuario creado: ${result.autosUserId}`);
  }

  if (!result.propiedadesUserId) {
    console.log(`🆕 Creando usuario ${ADMIN_PROPIEDADES_EMAIL}...`);
    result.propiedadesUserId = randomUUID();
    
    await db.insert(users).values({
      id: result.propiedadesUserId,
      email: ADMIN_PROPIEDADES_EMAIL,
      passwordHash: oldUser.passwordHash,
      name: 'SimplePropiedades',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Usuario creado: ${result.propiedadesUserId}`);
  }

  // 4. Migrar publicaciones de autos
  console.log('🚗 Migrando publicaciones de autos...');
  
  const listingsUpdate = await db
    .update(listings)
    .set({ ownerId: result.autosUserId })
    .where(
      and(
        eq(listings.ownerId, oldUser.id),
        eq(listings.vertical, 'autos')
      )
    )
    .returning({ id: listings.id });

  result.listingsMigrated = listingsUpdate.length;
  console.log(`✅ ${result.listingsMigrated} publicaciones migradas`);

  // 5. Migrar borradores de autos
  console.log('📝 Migrando borradores de autos...');
  
  const draftsUpdate = await db
    .update(listingDrafts)
    .set({ userId: result.autosUserId })
    .where(
      and(
        eq(listingDrafts.userId, oldUser.id),
        eq(listingDrafts.vertical, 'autos')
      )
    )
    .returning({ id: listingDrafts.id });

  result.draftsMigrated = draftsUpdate.length;
  console.log(`✅ ${result.draftsMigrated} borradores migrados`);

  // 6. Crear perfiles públicos
  console.log('👤 Creando perfiles públicos...');

  // Verificar si ya existen perfiles
  const existingAutosProfile = await db
    .select({ id: publicProfiles.id })
    .from(publicProfiles)
    .where(
      and(
        eq(publicProfiles.userId, result.autosUserId!),
        eq(publicProfiles.vertical, 'autos')
      )
    )
    .limit(1);

  const existingPropiedadesProfile = await db
    .select({ id: publicProfiles.id })
    .from(publicProfiles)
    .where(
      and(
        eq(publicProfiles.userId, result.propiedadesUserId!),
        eq(publicProfiles.vertical, 'propiedades')
      )
    )
    .limit(1);

  if (existingAutosProfile.length === 0) {
    console.log('🆕 Creando perfil para SimpleAutos...');
    await db.insert(publicProfiles).values({
      id: randomUUID(),
      userId: result.autosUserId!,
      vertical: 'autos',
      slug: 'simpleautos',
      displayName: 'SimpleAutos',
      accountKind: 'company',
      headline: 'Gestión profesional de venta de vehículos',
      bio: 'Somos SimpleAutos, tu aliado para comprar o vender vehículos de forma segura y profesional. Ofrecemos gestión completa desde la publicación hasta el cierre de la operación.',
      isPublished: true,
      leadRoutingMode: 'owner',
      publicEmail: ADMIN_AUTOS_EMAIL,
      socialLinks: {},
      businessHours: [],
      specialties: [],
      createdAt: now,
      updatedAt: now,
    });
    result.profilesCreated++;
    console.log('✅ Perfil SimpleAutos creado');
  } else {
    console.log('⚠️  Perfil SimpleAutos ya existe');
  }

  if (existingPropiedadesProfile.length === 0) {
    console.log('🆕 Creando perfil para SimplePropiedades...');
    await db.insert(publicProfiles).values({
      id: randomUUID(),
      userId: result.propiedadesUserId!,
      vertical: 'propiedades',
      slug: 'simplepropiedades',
      displayName: 'SimplePropiedades',
      accountKind: 'company',
      headline: 'Gestión profesional de bienes raíces',
      bio: 'Somos SimplePropiedades, especialistas en la compra, venta y arriendo de propiedades. Gestionamos todo el proceso para que tengas una experiencia sin complicaciones.',
      isPublished: true,
      leadRoutingMode: 'owner',
      publicEmail: ADMIN_PROPIEDADES_EMAIL,
      socialLinks: {},
      businessHours: [],
      specialties: [],
      createdAt: now,
      updatedAt: now,
    });
    result.profilesCreated++;
    console.log('✅ Perfil SimplePropiedades creado');
  } else {
    console.log('⚠️  Perfil SimplePropiedades ya existe');
  }

  // Cerrar conexión
  await client.end();

  console.log('\n📊 Resumen de migración:');
  console.log(`   - Usuario viejo: ${result.oldUserId}`);
  console.log(`   - Usuario autos: ${result.autosUserId}`);
  console.log(`   - Usuario propiedades: ${result.propiedadesUserId}`);
  console.log(`   - Publicaciones migradas: ${result.listingsMigrated}`);
  console.log(`   - Borradores migrados: ${result.draftsMigrated}`);
  console.log(`   - Perfiles creados: ${result.profilesCreated}`);
  console.log('\n✅ Migración completada exitosamente');

  return result;
}

// Ejecutar migración
migrateAdminAccounts()
  .then((result) => {
    console.log('\n🔑 Credenciales para login:');
    console.log(`   Email: ${ADMIN_AUTOS_EMAIL}`);
    console.log(`   Email: ${ADMIN_PROPIEDADES_EMAIL}`);
    console.log(`   Contraseña: (misma que ${ADMIN_OLD_EMAIL})`);
    console.log('\n📱 URLs de perfil público:');
    console.log(`   https://simpleautos.cl/perfil/simpleautos`);
    console.log(`   https://simplepropiedades.cl/perfil/simplepropiedades`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la migración:', error);
    process.exit(1);
  });
