'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '@simple/config';

export interface MusicianLineupInvitation {
    id: string;
    serenataId: string;
    status: 'invited' | 'requested' | 'accepted' | 'declined' | 'removed';
    initiator: 'coordinator' | 'musician' | null;
    invitedAt: string;
    respondedAt: string | null;
    recipientName?: string | null;
    address?: string | null;
    city?: string | null;
    eventDate?: string | null;
    eventTime?: string | null;
    duration?: number | null;
    price?: number | null;
    message?: string | null;
    serenataStatus?: string;
    coordinatorProfileId?: string | null;
}

export interface CrewInvitation {
    /** Id de membresía en cuadrilla (`serenata_coordinator_crew_memberships`). */
    crewMembershipId: string;
    /** Alias retrocompatible con respuestas antiguas. */
    profileId: string;
    membershipStatus: 'invited' | 'requested' | 'active' | 'declined' | 'removed';
    membershipInitiator: 'coordinator' | 'musician' | null;
    membershipInvitedAt: string | null;
    membershipMessage: string | null;
    coordinatorProfileId: string | null;
    city: string | null;
    rating: string | null;
    coordinatorName: string | null;
}

export interface MusicianInvitationsCounts {
    lineupInvited: number;
    lineupRequested: number;
    crewInvited: number;
    crewRequested: number;
}

export interface MusicianInvitationsResponse {
    ok: boolean;
    lineup: MusicianLineupInvitation[];
    crew: CrewInvitation[];
    counts: MusicianInvitationsCounts;
    totalPending: number;
}

const EMPTY_COUNTS: MusicianInvitationsCounts = {
    lineupInvited: 0,
    lineupRequested: 0,
    crewInvited: 0,
    crewRequested: 0,
};

/**
 * Bandeja de invitaciones (lineup + crew) del músico autenticado.
 * Polling cada 60s para mantener el badge fresco sin sobrecargar la API.
 */
export function useMusicianInvitations(options: { pollMs?: number } = {}) {
    const { pollMs = 60000 } = options;
    const [lineup, setLineup] = useState<MusicianLineupInvitation[]>([]);
    const [crew, setCrew] = useState<CrewInvitation[]>([]);
    const [counts, setCounts] = useState<MusicianInvitationsCounts>(EMPTY_COUNTS);
    const [totalPending, setTotalPending] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/invitations`, {
                credentials: 'include',
            });
            const data = (await res.json().catch(() => ({}))) as Partial<MusicianInvitationsResponse>;
            if (res.ok && data.ok) {
                setLineup(data.lineup ?? []);
                const rawCrew = (data.crew ?? []) as CrewInvitation[];
                setCrew(
                    rawCrew.map((item: CrewInvitation) => {
                        const pid = item.profileId ?? '';
                        const cid = item.crewMembershipId ?? pid;
                        return {
                            ...item,
                            crewMembershipId: cid,
                            profileId: pid || cid,
                        };
                    })
                );
                setCounts(data.counts ?? EMPTY_COUNTS);
                setTotalPending(data.totalPending ?? 0);
                setError(null);
            } else {
                setError('No pudimos cargar tus invitaciones');
            }
        } catch (err) {
            console.error('[useMusicianInvitations] error', err);
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        if (pollMs <= 0) return;
        const interval = setInterval(() => {
            void refresh();
        }, pollMs);
        return () => clearInterval(interval);
    }, [refresh, pollMs]);

    const respondLineup = useCallback(
        async (serenataId: string, accept: boolean, reason?: string) => {
            const res = await fetch(
                `${API_BASE}/api/serenatas/${serenataId}/lineup/respond`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ accept, reason }),
                }
            );
            const data = await res.json().catch(() => ({}));
            await refresh();
            return { ok: res.ok && data?.ok, data };
        },
        [refresh]
    );

    const respondCrew = useCallback(
        async (crewMembershipId: string, accept: boolean) => {
            const res = await fetch(
                `${API_BASE}/api/serenatas/musicians/me/memberships/${crewMembershipId}/respond`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ accept }),
                }
            );
            const data = await res.json().catch(() => ({}));
            await refresh();
            return { ok: res.ok && data?.ok, data };
        },
        [refresh]
    );

    return {
        lineup,
        crew,
        counts,
        totalPending,
        isLoading,
        error,
        refresh,
        respondLineup,
        respondCrew,
    };
}
