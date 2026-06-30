#!/usr/bin/env tsx
/**
 * Idempotent seed script: creates/updates the 5 platform admin accounts.
 *
 * Run:  pnpm --filter=@simple/api exec tsx scripts/seed-admin-users.ts
 *   or  pnpm seed:admins  (after adding to package.json)
 *
 * Safe to run multiple times — uses UPSERT by email.
 * Does NOT touch existing listings or publications.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { users, accounts, accountUsers } from '../src/db/schema.js';

if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set');
    process.exit(1);
}

const PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'Pik@0819';

type AdminDef = {
    email: string;
    name: string;
    role: 'superadmin' | 'admin';
    primaryVertical: string | null;
};

const ADMIN_ACCOUNTS: AdminDef[] = [
    {
        email: 'admin@simpleplataforma.app',
        name: 'Admin Plataforma',
        role: 'superadmin',
        primaryVertical: null,
    },
    {
        email: 'admin@simpleautos.app',
        name: 'Admin SimpleAutos',
        role: 'admin',
        primaryVertical: 'autos',
    },
    {
        email: 'admin@simplepropiedades.app',
        name: 'Admin SimplePropiedades',
        role: 'admin',
        primaryVertical: 'propiedades',
    },
    {
        email: 'admin@simpleagenda.app',
        name: 'Admin SimpleAgenda',
        role: 'admin',
        primaryVertical: 'agenda',
    },
];

async function ensureAccount(db: ReturnType<typeof drizzle>, userId: string, userName: string): Promise<void> {
    const existing = await db
        .select({ id: accountUsers.accountId })
        .from(accountUsers)
        .where(and(eq(accountUsers.userId, userId), eq(accountUsers.isDefault, true)))
        .limit(1);

    if (existing.length > 0) {
        console.log(`   Account already exists for user ${userId}`);
        return;
    }

    const now = new Date();
    const [account] = await db.insert(accounts).values({
        name: userName,
        type: 'general',
        ownerUserId: userId,
        isPersonal: true,
        createdAt: now,
        updatedAt: now,
    }).returning({ id: accounts.id });

    await db.insert(accountUsers).values({
        accountId: account.id,
        userId,
        role: 'owner',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    });

    console.log(`   ✅ Primary account created: ${account.id}`);
}

async function seedAdminUsers(): Promise<void> {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    console.log('\n👤 Processing admin accounts...\n');

    for (const def of ADMIN_ACCOUNTS) {
        console.log(`→ ${def.email} (${def.role}${def.primaryVertical ? ` / ${def.primaryVertical}` : ''})`);

        const existing = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.email, def.email))
            .limit(1);

        const now = new Date();

        if (existing.length > 0) {
            const userId = existing[0].id;
            await db.update(users).set({
                name: def.name,
                passwordHash,
                role: def.role,
                status: 'verified',
                primaryVertical: def.primaryVertical,
                provider: 'local',
                updatedAt: now,
            }).where(eq(users.id, userId));

            console.log(`   ✅ Updated existing user: ${userId}`);
            try { await ensureAccount(db, userId, def.name); } catch { console.log('   ⚠️  Skipped account (tables not ready)'); }
        } else {
            const userId = randomUUID();
            await db.insert(users).values({
                id: userId,
                email: def.email,
                name: def.name,
                passwordHash,
                role: def.role,
                status: 'verified',
                primaryVertical: def.primaryVertical,
                provider: 'local',
                createdAt: now,
                updatedAt: now,
            });

            console.log(`   ✅ Created new user: ${userId}`);
            try { await ensureAccount(db, userId, def.name); } catch { console.log('   ⚠️  Skipped account (tables not ready)'); }
        }
    }

    await client.end();

    console.log('\n✅ Seed complete!\n');
    console.log('Accounts ready:');
    ADMIN_ACCOUNTS.forEach((a) => {
        console.log(`  ${a.email} → ${a.role}${a.primaryVertical ? ` (${a.primaryVertical})` : ''}`);
    });
    console.log(`\nPassword for all: ${PASSWORD}`);
}

seedAdminUsers().then(() => process.exit(0)).catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
});
