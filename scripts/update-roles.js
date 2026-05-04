const postgres = require('postgres');

const sql = postgres('postgresql://postgres:password@localhost:5432/simplev2');

async function updateRoles() {
  try {
    // Actualizar cliente
    await sql`UPDATE users SET role = 'client' WHERE email = 'cliente@simpleserenatas.app'`;
    console.log('✅ Cliente: cliente@simpleserenatas.app → role: client');

    // Actualizar músico
    await sql`UPDATE users SET role = 'musician' WHERE email = 'musico@simpleserenatas.app'`;
    console.log('✅ Músico: musico@simpleserenatas.app → role: musician');

    // Actualizar coordinador (base musician)
    await sql`UPDATE users SET role = 'musician' WHERE email = 'coordinador@simpleserenatas.app'`;
    console.log('✅ Coordinador: coordinador@simpleserenatas.app → role: musician (base)');

    await sql.end();
    console.log('\n🎉 Roles actualizados correctamente');
    console.log('\n📋 Usuarios de prueba:');
    console.log('  • cliente@simpleserenatas.app / Pik@0819 (Cliente)');
    console.log('  • musico@simpleserenatas.app / Pik@0819 (Músico)');
    console.log('  • coordinador@simpleserenatas.app / Pik@0819 (Coordinador)');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateRoles();
