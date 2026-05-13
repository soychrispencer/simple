import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const email = process.argv[2] || 'test@test.com';
const newPassword = process.argv[3] || '123456';

async function resetPassword() {
  console.log(`Reseteando contraseña para: ${email}\n`);

  try {
    // Buscar usuario
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      console.log(`❌ Usuario ${email} no encontrado`);
      console.log('\nUsuarios existentes:');
      const allUsers = await db.select({ email: users.email, name: users.name }).from(users);
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.name})`));
      process.exit(1);
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar
    await db.update(users)
      .set({ passwordHash: hashedPassword, status: 'verified' })
      .where(eq(users.id, user.id));

    console.log(`✅ Contraseña actualizada para ${email}`);
    console.log(`   Nueva contraseña: ${newPassword}`);
    console.log(`   Ahora puedes hacer login con estas credenciales`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
