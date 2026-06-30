import type { AddressBookEntry } from '@simple/types';
import {
    fetchAccountPublicProfile,
    updateAccountPublicProfile,
    type PublicProfileVertical,
} from './public-profile-settings.js';

export async function syncMarketplaceProfileWithDefaultAddress(
    vertical: PublicProfileVertical,
    defaultEntry: AddressBookEntry,
    options?: { linkPrimaryAddress?: boolean },
): Promise<{ ok: boolean }> {
    const current = await fetchAccountPublicProfile(vertical);
    if (!current?.ok) return { ok: false };

    const hadPrimary = Boolean(current.profile.primaryAddressId);
    const linkPrimary = options?.linkPrimaryAddress ?? hadPrimary;

    const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...profileBody } = current.profile;

    const response = await updateAccountPublicProfile(vertical, {
        ...profileBody,
        regionId: defaultEntry.regionId,
        localityId: defaultEntry.communeId,
        region: defaultEntry.regionName,
        city: defaultEntry.communeName,
        countryCode: defaultEntry.countryCode ?? 'CL',
        ...(linkPrimary
            ? { primaryAddressId: defaultEntry.id, addressLine: null }
            : {}),
    });

    return { ok: response.ok === true };
}
