#!/usr/bin/env node
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/simplev2';

async function main() {
  console.log('Agregando columna instruments...');
  const client = postgres(DATABASE_URL);
  
  try {
    await client`ALTER TABLE serenata_musicians ADD COLUMN IF NOT EXISTS instruments VARCHAR(255)[]`;
    console.log('✅ Columna instruments agregada correctamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
