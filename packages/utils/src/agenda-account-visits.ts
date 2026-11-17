import { apiFetch } from './api-client.js';

export type AgendaAccountVisitStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AgendaAccountVisitType = 'property_visit' | 'brokerage_meeting';

export type AgendaAccountVisit = {
    id: string;
    accountId: string;
    visitType: AgendaAccountVisitType;
    listingId: string | null;
    contactUserId: string | null;
    contactName: string;
    contactPhone: string | null;
    assignedUserId: string | null;
    assignedUserName?: string | null;
    createdByUserId: string;
    startsAt: string;
    durationMinutes: number;
    status: AgendaAccountVisitStatus;
    location: string | null;
    internalNotes: string | null;
};

export type AgendaAccountVisitMember = {
    userId: string;
    name: string;
    role: string;
};

export type AgendaAccountVisitContext = {
    enabled: boolean;
    teamMode?: boolean;
    accountName?: string;
    role?: string;
    canManage?: boolean;
};

export type AgendaAccountVisitsState = AgendaAccountVisitContext & {
    members: AgendaAccountVisitMember[];
    membersHaveMore: boolean;
    visits: AgendaAccountVisit[];
    listings: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string; email: string | null }>;
};

type ApiResult<T> = { ok: boolean; error?: string } & T;

export async function fetchAgendaAccountVisitContext(): Promise<AgendaAccountVisitContext | null> {
    const { ok, data } = await apiFetch<ApiResult<AgendaAccountVisitContext>>(
        '/api/agenda/account-visits/context',
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return null;
    return {
        enabled: Boolean(data.enabled),
        teamMode: Boolean(data.teamMode),
        accountName: data.accountName,
        role: data.role,
        canManage: Boolean(data.canManage),
    };
}

export async function fetchAgendaAccountVisits(): Promise<AgendaAccountVisitsState | null> {
    const { ok, data } = await apiFetch<ApiResult<Partial<AgendaAccountVisitsState>>>(
        '/api/agenda/account-visits',
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return null;
    return {
        enabled: Boolean(data.enabled),
        teamMode: Boolean(data.teamMode),
        accountName: data.accountName,
        role: data.role,
        canManage: Boolean(data.canManage),
        members: Array.isArray(data.members) ? data.members : [],
        membersHaveMore: data.membersHaveMore === true,
        visits: Array.isArray(data.visits) ? data.visits : [],
        listings: Array.isArray(data.listings) ? data.listings : [],
        contacts: Array.isArray(data.contacts) ? data.contacts : [],
    };
}

export async function searchAgendaAccountVisitMembers(
    query = '',
    offset = 0,
): Promise<{ members: AgendaAccountVisitMember[]; hasMore: boolean; nextOffset: number } | null> {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('offset', String(offset));
    const { ok, data } = await apiFetch<ApiResult<{
        members?: AgendaAccountVisitMember[];
        hasMore?: boolean;
        nextOffset?: number;
    }>>(`/api/agenda/account-visits/members?${params.toString()}`, { method: 'GET' });
    if (!ok || !data?.ok) return null;
    return {
        members: Array.isArray(data.members) ? data.members : [],
        hasMore: data.hasMore === true,
        nextOffset: Number.isSafeInteger(data.nextOffset) ? Number(data.nextOffset) : offset,
    };
}

export type CreateAgendaAccountVisitInput = {
    visitType?: AgendaAccountVisitType;
    listingId?: string | null;
    contactUserId?: string | null;
    contactName?: string;
    contactPhone?: string;
    assignedUserId?: string | null;
    startsAt: string;
    durationMinutes?: number;
    location?: string;
    internalNotes?: string;
};

export async function createAgendaAccountVisit(input: CreateAgendaAccountVisitInput): Promise<{ ok: boolean; error?: string }> {
    const { ok, data } = await apiFetch<ApiResult<{ visit?: AgendaAccountVisit }>>(
        '/api/agenda/account-visits',
        { method: 'POST', body: JSON.stringify(input) },
    );
    return ok && data?.ok ? { ok: true } : { ok: false, error: data?.error ?? 'No pudimos agendar la visita.' };
}

export type UpdateAgendaAccountVisitInput = Partial<Pick<
    AgendaAccountVisit,
    'startsAt' | 'durationMinutes' | 'assignedUserId' | 'status' | 'location' | 'internalNotes'
>>;

export async function updateAgendaAccountVisit(
    visitId: string,
    input: UpdateAgendaAccountVisitInput,
): Promise<{ ok: boolean; error?: string }> {
    const { ok, data } = await apiFetch<ApiResult<{ visit?: AgendaAccountVisit }>>(
        `/api/agenda/account-visits/${encodeURIComponent(visitId)}`,
        { method: 'PATCH', body: JSON.stringify(input) },
    );
    return ok && data?.ok ? { ok: true } : { ok: false, error: data?.error ?? 'No pudimos guardar la visita.' };
}
