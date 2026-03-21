import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { not, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import path from 'path';
import fs from 'fs';

// Load correct .env
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const envDbUrl = match ? match[1].trim() : undefined;
const finalDatabaseUrl = process.env.DATABASE_URL?.trim() || envDbUrl;

if (!finalDatabaseUrl) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const client = postgres(finalDatabaseUrl);
const db = drizzle(client, { schema });

async function safeDelete(name: string, deletePromise: Promise<any>) {
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
  console.log('Starting DB cleanup...');

  try {
    await safeDelete('ad_campaigns', db.delete(schema.adCampaigns));
    await safeDelete('message_entries', db.delete(schema.messageEntries));
    await safeDelete('messageThreads', db.delete(schema.messageThreads));
    await safeDelete('listingLeadActivities', db.delete(schema.listingLeadActivities));
    await safeDelete('listingLeads', db.delete(schema.listingLeads));
    await safeDelete('serviceLeadActivities', db.delete(schema.serviceLeadActivities));
    await safeDelete('serviceLeads', db.delete(schema.serviceLeads));
    await safeDelete('crmPipelineColumns', db.delete(schema.crmPipelineColumns));
    await safeDelete('publicProfileTeamMembers', db.delete(schema.publicProfileTeamMembers));
    await safeDelete('publicProfiles', db.delete(schema.publicProfiles));
    await safeDelete('instagramPublications', db.delete(schema.instagramPublications));
    await safeDelete('instagramAccounts', db.delete(schema.instagramAccounts));
    await safeDelete('boostOrders', db.delete(schema.boostOrders));
    await safeDelete('follows', db.delete(schema.follows));
    await safeDelete('listingDrafts', db.delete(schema.listingDrafts));
    await safeDelete('savedListings', db.delete(schema.savedListings));
    await safeDelete('listings', db.delete(schema.listings));
    await safeDelete('emailVerificationTokens', db.delete(schema.emailVerificationTokens));
    await safeDelete('passwordResetTokens', db.delete(schema.passwordResetTokens));
    
    await safeDelete('users (excepto admin@simpleplataforma.app)', 
      db.delete(schema.users).where(not(eq(schema.users.email, 'admin@simpleplataforma.app')))
    );

    console.log('¡Limpieza completada exitosamente!');
    process.exit(0);
  } catch (err) {
    console.error('Error fatal limpiando BD:', err);
    process.exit(1);
  }
}

clean();
