'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    fetchAccountPublicProfile,
    resolveAutosPublishDefaults,
    resolvePropiedadesPublishDefaults,
    resolveOperatorPublishContext,
    type AutosListingOperation,
    type PropiedadesListingOperation,
    type PublicProfileVertical,
    type AutosOperatorPublishContext,
    type PropiedadesOperatorPublishContext,
} from '@simple/utils';

export type MarketplaceOperatorPublishDefaults = {
    autos?: { listingType: AutosListingOperation };
    propiedades?: { operationType: PropiedadesListingOperation };
};

type LoadedProfile = {
    accountKind: import('@simple/utils').PublicProfileAccountKind;
    operatorSubtype: string | null;
    specialties: string[];
    displayName: string;
};

export function useMarketplaceOperatorPublishDefaults(
    vertical: PublicProfileVertical,
    options: { enabled?: boolean; autosListingType?: AutosListingOperation } = {},
) {
    const enabled = options.enabled !== false;
    const autosListingType = options.autosListingType ?? 'sale';
    const [hint, setHint] = useState<string | null>(null);
    const [defaults, setDefaults] = useState<MarketplaceOperatorPublishDefaults | null>(null);
    const [profile, setProfile] = useState<LoadedProfile | null>(null);
    const [ready, setReady] = useState(!enabled);

    useEffect(() => {
        if (!enabled) {
            setReady(true);
            return;
        }

        let mounted = true;
        void (async () => {
            const response = await fetchAccountPublicProfile(vertical);
            if (!mounted) return;

            const loaded = response?.profile;
            if (!loaded) {
                setReady(true);
                return;
            }

            const input: LoadedProfile = {
                accountKind: loaded.accountKind,
                operatorSubtype: loaded.operatorSubtype,
                specialties: loaded.specialties,
                displayName: loaded.displayName,
            };
            setProfile(input);

            if (vertical === 'autos') {
                const resolved = resolveAutosPublishDefaults(input);
                setDefaults({ autos: { listingType: resolved.suggested } });
                setHint(resolved.hint);
            } else {
                const resolved = resolvePropiedadesPublishDefaults(input);
                setDefaults({ propiedades: { operationType: resolved.suggested } });
                setHint(resolved.hint);
            }

            setReady(true);
        })();

        return () => {
            mounted = false;
        };
    }, [vertical, enabled]);

    const autosContext = useMemo<AutosOperatorPublishContext>(() => {
        if (!profile) {
            return {
                showFleetRentFields: autosListingType === 'rent',
                showConsignmentFields: false,
            };
        }
        return resolveOperatorPublishContext('autos', profile, { autosListingType }).autos;
    }, [profile, autosListingType]);

    const propiedadesContext = useMemo<PropiedadesOperatorPublishContext>(() => {
        if (!profile) {
            return { emphasizeProjectOperation: false, showRentAdminFields: false, prefillDeveloperName: null };
        }
        return resolveOperatorPublishContext('propiedades', profile).propiedades;
    }, [profile]);

    return {
        hint,
        defaults,
        context: vertical === 'autos' ? autosContext : propiedadesContext,
        ready,
    };
}
