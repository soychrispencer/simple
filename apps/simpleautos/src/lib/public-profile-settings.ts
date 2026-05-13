import {
    checkPublicProfileSlugAvailability as checkPublicProfileSlugAvailabilityForVertical,
    fetchAccountPublicProfile as fetchAccountPublicProfileForVertical,
    updateAccountPublicProfile as updateAccountPublicProfileForVertical,
    type EditablePublicProfile as BaseEditablePublicProfile,
    type PublicProfileSettingsResponse as BasePublicProfileSettingsResponse,
} from '@simple/utils';

const VERTICAL = 'autos';

export type {
    EditablePublicProfileTeamMember,
    PublicProfileAccountKind,
    PublicProfileBusinessHour,
    PublicProfileDayId,
    PublicProfileLeadRoutingMode,
    PublicProfileSocialLinks,
} from '@simple/utils';

export type EditablePublicProfile = Omit<BaseEditablePublicProfile, 'vertical'> & { vertical: typeof VERTICAL };
export type PublicProfileSettingsResponse = Omit<BasePublicProfileSettingsResponse, 'profile'> & {
    profile: EditablePublicProfile;
};

export function fetchAccountPublicProfile(): Promise<PublicProfileSettingsResponse | null> {
    return fetchAccountPublicProfileForVertical(VERTICAL) as Promise<PublicProfileSettingsResponse | null>;
}

export function checkPublicProfileSlugAvailability(
    slug: string
): Promise<{ ok: boolean; slug?: string; available?: boolean; error?: string }> {
    return checkPublicProfileSlugAvailabilityForVertical(VERTICAL, slug);
}

export function updateAccountPublicProfile(
    input: Omit<EditablePublicProfile, 'id' | 'userId' | 'vertical' | 'publicUrl'>
): Promise<PublicProfileSettingsResponse | { ok: false; unauthorized?: boolean; error: string }> {
    return updateAccountPublicProfileForVertical(VERTICAL, input) as Promise<
        PublicProfileSettingsResponse | { ok: false; unauthorized?: boolean; error: string }
    >;
}
