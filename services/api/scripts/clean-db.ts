import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { not, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import * as readline from 'readline';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL no está definido. Ejecuta con: DATABASE_URL=... pnpm run db:clean');
  process.exit(1);
}

// Protección: abortar si parece producción
if (DATABASE_URL.includes('prod') || DATABASE_URL.includes('render') || DATABASE_URL.includes('railway')) {
  console.error('❌ Abortado: DATABASE_URL parece ser un entorno de producción.');
  console.error('   Este script solo debe ejecutarse contra bases de datos de desarrollo.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'si' || answer.trim().toLowerCase() === 's');
    });
  });
}

async function safeDelete(name: string, deletePromise: Promise<any>) {
  if (isDryRun) {
    console.log(`[dry-run] Se borraría: ${name}`);
    return;
  }
  console.log(`Borrando ${name}...`);
  try {
    await deletePromise;
  } catch (err: any) {
    if (err.code === '42P01') {
      console.log(`⚠️ Tabla omitida (no existe): ${name}`);
    } else {
      console.error(`❌ Error al borrar ${name}:`, err.message);
    }
  }
}

async function clean() {
  const dbMatch = DATABASE_URL.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbMatch ? dbMatch[1] : '(desconocida)';

  console.log(`\n⚠️  Vas a borrar TODOS los datos de la base de datos: ${dbName}`);
  if (isDryRun) {
    console.log('   Modo dry-run: no se borrará nada.\n');
  } else {
    const confirmed = await confirm('Escribe "si" para continuar: ');
    if (!confirmed) {
      console.log('Cancelado.');
      await client.end();
      process.exit(0);
    }
    console.log('');
  }

  try {
    await safeDelete('ad_campaigns', db.delete(schema.adCampaigns));
    await safeDelete('message_entries', db.delete(schema.messageEntries));
    await safeDelete('message_threads', db.delete(schema.messageThreads));
    await safeDelete('public_profiles', db.delete(schema.publicProfiles));
    await safeDelete('instagram_publications', db.delete(schema.instagramPublications));
    await safeDelete('instagram_accounts', db.delete(schema.instagramAccounts));
    await safeDelete('boost_orders', db.delete(schema.boostOrders));
    await safeDelete('follows', db.delete(schema.follows));
    await safeDelete('listing_drafts', db.delete(schema.listingDrafts));
    await safeDelete('saved_listings', db.delete(schema.savedListings));
    await safeDelete('listings', db.delete(schema.listings));
    await safeDelete('email_verification_tokens', db.delete(schema.emailVerificationTokens));
    await safeDelete('password_reset_tokens', db.delete(schema.passwordResetTokens));

    await safeDelete('users (excepto admin@simpleplataforma.app)',
      db.delete(schema.users).where(not(eq(schema.users.email, 'admin@simpleplataforma.app')))
    );

    if (isDryRun) {
      console.log('\nDry-run completado. No se borró nada.');
    } else {
      console.log('\n¡Limpieza completada exitosamente!');
    }
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error fatal limpiando BD:', err);
    await client.end();
    process.exit(1);
  }
}

clean();
