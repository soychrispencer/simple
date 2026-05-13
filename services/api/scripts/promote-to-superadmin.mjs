#!/usr/bin/env node

/**
 * Script para promover un usuario a superadmin
 * 
 * Uso:
 *   node scripts/promote-to-superadmin.mjs <email> [role] [admin-email] [admin-password] [api-url]
 * 
 * Ejemplos:
 *   # Versión rápida (requiere estar logueado en SimpleAdmin)
 *   node scripts/promote-to-superadmin.mjs chris@example.com superadmin
 * 
 *   # Versión con credenciales de admin
 *   node scripts/promote-to-superadmin.mjs chris@example.com superadmin admin@example.com password123
 * 
 *   # Con URL personalizada
 *   node scripts/promote-to-superadmin.mjs chris@example.com superadmin admin@example.com password123 http://api.example.com
 */

const email = process.argv[2];
const role = process.argv[3] || 'superadmin';
const adminEmail = process.argv[4];
const adminPassword = process.argv[5];
const apiUrl = process.argv[6] || 'http://localhost:4000';

// Validación
if (!email) {
    console.error('❌ Error: Debes proporcionar un email');
    console.error('Uso: node scripts/promote-to-superadmin.mjs <email-a-promover> [role] [admin-email] [admin-password] [api-url]');
    process.exit(1);
}

if (!['user', 'admin', 'superadmin'].includes(role)) {
    console.error(`❌ Error: Rol inválido. Debe ser 'user', 'admin' o 'superadmin'. Recibido: ${role}`);
    process.exit(1);
}

console.log(`🔄 Promoviendo usuario ${email} a ${role}...`);
console.log(`📡 API: ${apiUrl}\n`);

let cookieJar = '';

// Usar fetch nativo de Node.js (disponible en v18+)
(async () => {
    try {
        // Si se proporciona admin email/password, autenticarse primero
        if (adminEmail && adminPassword) {
            console.log('🔐 Autenticando como ' + adminEmail);
            const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: adminEmail,
                    password: adminPassword,
                }),
            });

            if (!loginResponse.ok) {
                const errorData = await loginResponse.json().catch(() => ({}));
                console.error(`❌ Error de autenticación: ${errorData.error || loginResponse.statusText}`);
                process.exit(1);
            }

            // Guardar cookies de la respuesta
            const setCookieHeader = loginResponse.headers.get('set-cookie');
            if (setCookieHeader) {
                cookieJar = setCookieHeader.split(';')[0];
            }
            console.log('✓ Autenticación exitosa\n');
        }

        // Obtener los usuarios disponibles
        const listResponse = await fetch(`${apiUrl}/api/admin/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieJar && { 'Cookie': cookieJar }),
            },
        });

        if (listResponse.status === 401) {
            console.error('❌ Error: No autenticado.');
            console.error('   Opción 1: Proporciona credenciales de admin');
            console.error('     node scripts/promote-to-superadmin.mjs user@email admin@email.com password123');
            console.error('   Opción 2: Accede a SimpleAdmin y ejecuta sin parámetros dentro de 5 minutos');
            process.exit(1);
        }

        if (!listResponse.ok) {
            console.error(`❌ Error: No se pudo obtener la lista de usuarios (${listResponse.status})`);
            process.exit(1);
        }

        const data = await listResponse.json();
        const users = data.items || [];
        const user = users.find(u => u.email === email);

        if (!user) {
            console.error(`❌ Error: No se encontró usuario con email: ${email}`);
            console.log('\nUsuarios disponibles:');
            users.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
            process.exit(1);
        }

        const oldRole = user.role;

        // Actualizar el rol
        const updateResponse = await fetch(`${apiUrl}/api/admin/users/${user.id}/role`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieJar && { 'Cookie': cookieJar }),
            },
            body: JSON.stringify({ role }),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json().catch(() => ({}));
            console.error(`❌ Error: No se pudo actualizar el usuario: ${errorData.error || updateResponse.statusText}`);
            process.exit(1);
        }

        console.log('✅ Usuario actualizado exitosamente\n');
        console.log(`   Nombre:  ${user.name}`);
        console.log(`   Email:   ${user.email}`);
        console.log(`   Rol:     ${oldRole} → ${role}`);
        console.log(`   ID:      ${user.id}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Verifica:');
        console.error('   1. El API está corriendo: ' + apiUrl);
        console.error('   2. Las credenciales son correctas (si las proporcionaste)');
        console.error('   3. El email existe en la base de datos');
        process.exit(1);
    }
})();
