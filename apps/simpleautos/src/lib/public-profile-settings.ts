import { API_BASE } from './api-config';

export type PublicProfileAccountKind = 'individual' | 'independent' | 'company';
export type PublicProfileLeadRoutingMode = 'owner' | 'round_robin' | 'unassigned';
export type PublicProfileDayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type PublicProfileSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    x: string | null;
};

export type PublicProfileBusinessHour = {
    day: PublicProfileDayId;
    open: string | null;
    close: string | null;
    closed: boolean;
};

export type EditablePublicProfileTeamMember = {
    id: string | null;
    name: string;
    roleTitle: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    avatarImageUrl: string | null;
    socialLinks: {
        instagram: string | null;
        facebook: string | null;
        linkedin: string | null;
    };
    specialties: string[];
    isLeadContact: boolean;
    receivesLeads: boolean;
    isPublished: boolean;
};

export type EditablePublicProfile = {
    id: string | null;
    userId: string;
    vertical: 'autos';
    slug: string;
    isPublished: boolean;
    accountKind: PublicProfileAccountKind;
    leadRoutingMode: PublicProfileLeadRoutingMode;
    displayName: string;
    headline: string | null;
    bio: string | null;
    companyName: string | null;
    website: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    socialLinks: PublicProfileSocialLinks;
    businessHours: PublicProfileBusinessHour[];
    specialties: string[];
    teamMembers: EditablePublicProfileTeamMember[];
    scheduleNote: string | null;
    alwaysOpen: boolean;
    publicUrl: string | null;
};

export type PublicProfileSettingsResponse = {
    ok: boolean;
    featureEnabled: boolean;
    currentPlanId: 'free' | 'basic' | 'pro' | 'enterprise';
    currentPlanName: string;
    profile: EditablePublicProfile;
    error?: string;
};

type SlugCheckResponse = {
    ok: boolean;
    slug?: string;
    available?: boolean;
    error?: string;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });
        return (await response.json().catch(() => null)) as T | null;
    } catch {
        return null;
    }
}

export async function fetchAccountPublicProfile(): Promise<PublicProfileSettingsResponse | null> {
    return apiRequest<PublicProfileSettingsResponse>('/api/account/public-profile?vertical=autos', { method: 'GET' });
}

export async function checkPublicProfileSlugAvailability(slug: string): Promise<{ ok: boolean; slug?: string; available?: boolean; error?: string }> {
    const data = await apiRequest<SlugCheckResponse>(`/api/account/public-profile/slug-check?vertical=autos&slug=${encodeURIComponent(slug)}`, {
        method: 'GET',
    });
    if (!data) return { ok: false, error: 'No pudimos verificar el enlace público.' };
    if (!data.ok) return { ok: false, error: data.error ?? 'No pudimos verificar el enlace público.' };
    return { ok: true, slug: data.slug, available: data.available };
}

export async function updateAccountPublicProfile(input: Omit<EditablePublicProfile, 'id' | 'userId' | 'vertical' | 'publicUrl'>): Promise<PublicProfileSettingsResponse | { ok: false; unauthorized?: boolean; error: string }> {
    try {
        const response = await fetch(`${API_BASE}/api/account/public-profile?vertical=autos`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        const data = (await response.json().catch(() => null)) as PublicProfileSettingsResponse | { ok: false; error?: string } | null;
        if (response.status === 401) {
            return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
        }
        if (!response.ok || !data?.ok) {
            return { ok: false, error: (data as { error?: string } | null)?.error ?? 'No pudimos guardar tu perfil público.' };
        }
        return data;
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
