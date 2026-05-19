import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import type { db } from '../../db/index.js';
import { publicProfiles } from '../../db/schema.js';

export type LeadRoutingAssignmentDeps = {
    db: typeof db;
    eq: typeof eq;
    getPublicProfileRecord: (ownerUserId: string, vertical: VerticalType) => {
        id?: string;
        leadRoutingMode?: string | null;
        leadRoutingCursor?: number | null;
    } | null | undefined;
    getLeadRoutingCandidates: (
        ownerUserId: string,
        vertical: VerticalType,
    ) => Array<{ id: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapPublicProfileRow: (row: any) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsertPublicProfileCache: (profile: any) => void;
};

export function createResolveInitialListingLeadAssignment(deps: LeadRoutingAssignmentDeps) {
    const {
        db: database,
        eq: eqFn,
        getPublicProfileRecord,
        getLeadRoutingCandidates,
        mapPublicProfileRow,
        upsertPublicProfileCache,
    } = deps;

    return async function resolveInitialListingLeadAssignment(
        ownerUserId: string,
        vertical: VerticalType,
    ): Promise<{
        assignedToUserId: string | null;
        assignedToTeamMemberId: string | null;
    }> {
        const profile = getPublicProfileRecord(ownerUserId, vertical);
        const routingMode = profile?.leadRoutingMode ?? 'round_robin';
        if (routingMode === 'unassigned') {
            return {
                assignedToUserId: null,
                assignedToTeamMemberId: null,
            };
        }
        if (routingMode === 'owner') {
            return {
                assignedToUserId: ownerUserId,
                assignedToTeamMemberId: null,
            };
        }

        const candidateTeam = getLeadRoutingCandidates(ownerUserId, vertical);

        if (candidateTeam.length === 0) {
            return {
                assignedToUserId: ownerUserId,
                assignedToTeamMemberId: null,
            };
        }

        const cursor = profile?.leadRoutingCursor ?? 0;
        const nextMember = candidateTeam[cursor % candidateTeam.length] ?? candidateTeam[0]!;
        if (profile?.id) {
            const rows = await database
                .update(publicProfiles)
                .set({ leadRoutingCursor: cursor + 1 })
                .where(eqFn(publicProfiles.id, profile.id))
                .returning();
            const savedProfile = rows[0] ?? null;
            if (savedProfile) {
                upsertPublicProfileCache(mapPublicProfileRow(savedProfile));
            }
        }
        return {
            assignedToUserId: null,
            assignedToTeamMemberId: nextMember.id,
        };
    };
}
