'use client';

import { useEffect, useState } from 'react';
import {
    fetchAccountPublicProfile,
    resolveAppMediaUrl,
    type PublicProfileVertical,
} from '@simple/utils';

/** Logo y nombre de Mi negocio (perfil público), para alinear sidebar y cards. */
export function useMarketplaceBusinessBrand(vertical: PublicProfileVertical) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void fetchAccountPublicProfile(vertical)
            .then((response) => {
                if (cancelled || !response?.ok || !response.profile) return;
                const profile = response.profile;
                const logo = resolveAppMediaUrl(profile.avatarImageUrl);
                const name = profile.displayName?.trim() || profile.companyName?.trim() || null;
                setLogoUrl(logo);
                setDisplayName(name);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [vertical]);

    return { logoUrl, displayName };
}
