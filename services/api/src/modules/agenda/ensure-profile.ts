import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { normalizeTimezone } from '@simple/utils';
import type { AppUser } from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { agendaProfessionalProfiles } from '../../db/schema.js';
import { getAgendaProfile, ensureAgendaProfileTrial } from './plan-limits.js';
import { isValidAgendaSlug } from './runtime-support.js';

type EnsurePrimaryAccount = (user: AppUser) => Promise<{ id: string }>;

function slugBaseFromUser(user: Pick<AppUser, 'name' | 'email'>): string {
    const fromName = (user.name ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (fromName.length >= 3) return fromName.slice(0, 40);
    const emailPart = user.email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
    if (emailPart.length >= 3) return emailPart.slice(0, 40);
    return 'profesional';
}

async function pickUniqueSlug(user: Pick<AppUser, 'name' | 'email'>): Promise<string> {
    const base = slugBaseFromUser(user);
    for (let attempt = 0; attempt < 12; attempt++) {
        const suffix = attempt === 0 ? Date.now().toString(36) : randomBytes(3).toString('hex');
        let candidate = `${base}-${suffix}`.slice(0, 60);
        const validation = isValidAgendaSlug(candidate);
        if (!validation.ok) {
            candidate = `prof-${suffix}`.slice(0, 60);
            if (!isValidAgendaSlug(candidate).ok) continue;
        }
        const existing = await db
            .select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.slug, candidate))
            .limit(1);
        if (existing.length === 0) return candidate;
    }
    return `agenda-${randomBytes(4).toString('hex')}`;
}

function defaultAgendaTrialEndsAt(from = new Date()): Date {
    const trialEndsAt = new Date(from);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    return trialEndsAt;
}

export function createEnsureAgendaProfile(deps: { ensurePrimaryAccountForUser: EnsurePrimaryAccount }) {
    const { ensurePrimaryAccountForUser } = deps;

    return async function ensureAgendaProfile(user: AppUser) {
        const existing = await getAgendaProfile(user.id);
        if (existing) return ensureAgendaProfileTrial(existing);

        const account = await ensurePrimaryAccountForUser(user);
        const slug = await pickUniqueSlug(user);
        const displayName = user.name?.trim() || user.email.split('@')[0] || null;

        const residenceCountry = (user.residenceCountryCode ?? 'CL').trim().toUpperCase() || 'CL';

        const [profile] = await db
            .insert(agendaProfessionalProfiles)
            .values({
                accountId: account.id,
                userId: user.id,
                slug,
                displayName,
                countryCode: residenceCountry,
                timezone: normalizeTimezone(user.timezone),
                plan: 'free',
                planExpiresAt: defaultAgendaTrialEndsAt(),
            })
            .returning();

        return profile;
    };
}
