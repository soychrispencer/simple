import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

type Role = 'admin' | 'superadmin';

async function main() {
    const emailArg = process.argv[2]?.trim().toLowerCase();
    const roleArg = (process.argv[3]?.trim().toLowerCase() as Role | undefined) ?? 'admin';

    if (!emailArg) {
        console.error('Usage: npm run user:promote-admin --workspace=@simple/api -- <email> [admin|superadmin]');
        process.exit(1);
    }

    if (roleArg !== 'admin' && roleArg !== 'superadmin') {
        console.error(`Invalid role "${roleArg}". Use "admin" or "superadmin".`);
        process.exit(1);
    }

    const existing = await db.select().from(users).where(eq(users.email, emailArg)).limit(1);
    if (existing.length === 0) {
        console.error(`User not found: ${emailArg}`);
        process.exit(1);
    }

    const [updated] = await db.update(users).set({
        role: roleArg,
        status: 'active',
        updatedAt: new Date(),
    }).where(eq(users.id, existing[0].id)).returning();

    console.log(`Promoted ${updated.email} to ${updated.role}.`);
}

main().catch((error) => {
    console.error('Failed to promote user:', error);
    process.exit(1);
});
