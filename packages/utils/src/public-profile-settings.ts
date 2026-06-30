import { apiFetch } from './api-client.js';

export type PublicProfileVertical = 'autos' | 'propiedades';
export type PublicProfileAccountKind = 'individual' | 'independent' | 'company';
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

export type ScheduleBlockedSlot = {
    id: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
};

export type EditablePublicProfile = {
    id: string | null;
    userId: string;
    vertical: PublicProfileVertical;
    slug: string;
    isPublished: boolean;
    accountKind: PublicProfileAccountKind;
    operatorSubtype: string | null;
    operatorSubtypeCustom: string | null;
    displayName: string;
    headline: string | null;
    bio: string | null;
    companyName: string | null;
    website: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    addressLine: string | null;
    primaryAddressId: string | null;
    city: string | null;
    region: string | null;
    countryCode: string;
    regionId: string | null;
    localityId: string | null;
    timezone: string;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    socialLinks: PublicProfileSocialLinks;
    businessHours: PublicProfileBusinessHour[];
    specialties: string[];
    scheduleNote: string | null;
    alwaysOpen: boolean;
    weeklyBreakStart: string | null;
    weeklyBreakEnd: string | null;
    scheduleBlockedSlots: ScheduleBlockedSlot[];
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

export async function fetchAccountPublicProfile(vertical: PublicProfileVertical): Promise<PublicProfileSettingsResponse | null> {
    const { data } = await apiFetch<PublicProfileSettingsResponse>(`/api/account/public-profile?vertical=${vertical}`, {
        method: 'GET',
    });
    return data;
}

export async function checkPublicProfileSlugAvailability(
    vertical: PublicProfileVertical,
    slug: string
): Promise<{ ok: boolean; slug?: string; available?: boolean; error?: string }> {
    const { data } = await apiFetch<SlugCheckResponse>(
        `/api/account/public-profile/slug-check?vertical=${vertical}&slug=${encodeURIComponent(slug)}`,
        { method: 'GET' }
    );
    if (!data) return { ok: false, error: 'No pudimos verificar el enlace público.' };
    if (!data.ok) return { ok: false, error: data.error ?? 'No pudimos verificar el enlace público.' };
    return { ok: true, slug: data.slug, available: data.available };
}

export async function updateAccountPublicProfile(
    vertical: PublicProfileVertical,
    input: Omit<EditablePublicProfile, 'id' | 'userId' | 'vertical' | 'publicUrl'>
): Promise<PublicProfileSettingsResponse> {
    const { data } = await apiFetch<PublicProfileSettingsResponse>(`/api/account/public-profile?vertical=${vertical}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
    if (!data) {
        return {
            ok: false,
            featureEnabled: false,
            currentPlanId: 'free',
            currentPlanName: 'Gratuito',
            profile: {
                id: null,
                userId: '',
                vertical,
                slug: '',
                isPublished: false,
                accountKind: 'individual',
                operatorSubtype: null,
                operatorSubtypeCustom: null,
                displayName: '',
                headline: null,
                bio: null,
                companyName: null,
                website: null,
                publicEmail: null,
                publicPhone: null,
                publicWhatsapp: null,
                addressLine: null,
                primaryAddressId: null,
                city: null,
                region: null,
                countryCode: 'CL',
                regionId: null,
                localityId: null,
                timezone: 'America/Santiago',
                coverImageUrl: null,
                avatarImageUrl: null,
                socialLinks: {
                    instagram: null,
                    facebook: null,
                    linkedin: null,
                    youtube: null,
                    tiktok: null,
                    x: null,
                },
                businessHours: [],
                specialties: [],
                scheduleNote: null,
                alwaysOpen: false,
                weeklyBreakStart: null,
                weeklyBreakEnd: null,
                scheduleBlockedSlots: [],
                publicUrl: null,
            },
            error: 'No pudimos guardar tu perfil público.',
        };
    }
    return data;
}
