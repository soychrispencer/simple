#!/usr/bin/env node

/**
 * Script para promover un usuario a superadmin
 * 
 * Uso:
 *   node scripts/promote-to-superadmin.mjs <email> [role]
 * 
 * Ejemplos:
 *   node scripts/promote-to-superadmin.mjs chris@example.com superadmin
 *   node scripts/promote-to-superadmin.mjs admin@example.com admin
 *   node scripts/promote-to-superadmin.mjs user@example.com user
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Cargar variables de entorno
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key && !key.startsWith('#')) {
            process.env[key.trim()] = rest.join('=').trim();
        }
    });
}

// Obtener argumentos
const email = process.argv[2];
let role = process.argv[3] || 'superadmin';

// Validación
if (!email) {
    console.error('❌ Error: Debes proporcionar un email');
    console.error('Uso: node scripts/promote-to-superadmin.mjs <email> [role]');
    process.exit(1);
}

if (!['user', 'admin', 'superadmin'].includes(role)) {
    console.error(`❌ Error: Rol inválido. Debe ser 'user', 'admin' o 'superadmin'. Recibido: ${role}`);
    process.exit(1);
}

// Obtener DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurado en .env');
    process.exit(1);
}

console.log('🔄 Conectando a la base de datos...');

// Conectar a PostgreSQL usando la URL
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    connectionString: databaseUrl,
});

(async () => {
    try {
        await client.connect();
        console.log('✓ Conectado a la base de datos');

        // Buscar el usuario
        const result = await client.query('SELECT id, name, email, role FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            console.error(`❌ Error: No se encontró usuario con email: ${email}`);
            process.exit(1);
        }

        const user = result.rows[0];
        const oldRole = user.role;

        // Actualizar el rol
        const updateResult = await client.query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
            [role, user.id]
        );

        if (updateResult.rows.length > 0) {
            const updated = updateResult.rows[0];
            console.log('\n✅ Usuario actualizado exitosamente\n');
            console.log(`   Nombre:  ${updated.name}`);
            console.log(`   Email:   ${updated.email}`);
            console.log(`   Rol:     ${oldRole} → ${updated.role}`);
            console.log(`   ID:      ${updated.id}\n`);
        } else {
            console.error('❌ Error: No se pudo actualizar el usuario');
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
