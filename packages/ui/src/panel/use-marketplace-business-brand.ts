'use client';

import { useEffect, useState } from 'react';
import {
    fetchAccountPublicProfile,
    resolveAppMediaUrl,
    type PublicProfileVertical,
} from '@simple/utils';

/** Logo y nombre de Mi negocio (perfil público), para alinear sidebar y cards. */
export function useMarketplaceBusinessBrand(vertical: PublicProfileVertical, userId?: string) {
    const [state, setState] = useState<{
        userId: string | null;
        logoUrl: string | null;
        displayName: string | null;
    }>({ userId: null, logoUrl: null, displayName: null });

    useEffect(() => {
        if (!userId) {
            setState({ userId: null, logoUrl: null, displayName: null });
            return;
        }
        let cancelled = false;
        setState({ userId, logoUrl: null, displayName: null });
        void fetchAccountPublicProfile(vertical)
            .then((response) => {
                if (cancelled || !response?.ok || !response.profile) return;
                const profile = response.profile;
                const logo = resolveAppMediaUrl(profile.avatarImageUrl);
                const name = profile.displayName?.trim() || profile.companyName?.trim() || null;
                setState({ userId, logoUrl: logo, displayName: name });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [vertical, userId]);

    return state.userId === (userId ?? null)
        ? { logoUrl: state.logoUrl, displayName: state.displayName }
        : { logoUrl: null, displayName: null };
}
