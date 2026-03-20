#!/usr/bin/env node

/**
 * Script para crear un usuario superadmin inicial
 * 
 * Uso:
 *   node scripts/seed-superadmin.mjs <email> <password> <name> [api-url]
 * 
 * Ejemplo:
 *   node scripts/seed-superadmin.mjs admin@simpleplataforma.app Pik@0819 "Admin User"
 */

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin User';
const apiUrl = process.argv[5] || 'http://localhost:4000';

// Validación
if (!email || !password) {
    console.error('❌ Error: Debes proporcionar email y contraseña');
    console.error('Uso: node scripts/seed-superadmin.mjs <email> <password> [name] [api-url]');
    process.exit(1);
}

if (password.length < 6) {
    console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
}

console.log('🌱 Creando usuario superadmin inicial...');
console.log(`   Email: ${email}`);
console.log(`   Nombre: ${name}`);
console.log(`   API: ${apiUrl}\n`);

(async () => {
    try {
        console.log('📡 Conectando a la API...');
        
        // Hacer POST a /api/admin/bootstrap
        const response = await fetch(`${apiUrl}/api/admin/bootstrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                password,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ Error: ${data.error || response.statusText}`);
            process.exit(1);
        }

        console.log('✅ Usuario superadmin creado exitosamente!\n');
        console.log('🎯 Puedes loguearte en SimpleAdmin con:');
        console.log(`   Email:       ${email}`);
        console.log(`   Contraseña:  ${password}`);
        console.log(`   URL:         http://localhost:3002\n`);
        console.log('ℹ️  El usuario ya está verificado y tiene permisos de administrador.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        console.error('\n💡 Verifica:');
        console.error('   1. El API esté corriendo: ' + apiUrl);
        console.error('   2. No haya otro administrador ya creado');
        console.error('   3. La contraseña sea válida (mín. 6 caracteres)');
        process.exit(1);
    }
})();
