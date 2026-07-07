'use client';

import type { FormEvent } from 'react';
import { OperatorSearchShell } from '@simple/ui/operator-directory';
import { type MarketplaceSearchFilters } from '@/lib/marketplace-search';

const SERENATAS_SEARCH_COPY = {
    queryPlaceholder: 'Buscar mariachi o grupo',
    queryAriaLabel: 'Buscar mariachi o grupo',
    footerHint: 'Elige país y ubicación para ver mariachis cerca. Con fecha, filtramos grupos con horarios posibles ese día.',
    submitLabel: 'Buscar',
    localityPlaceholder: 'Comuna',
} as const;

export function MarketplaceSearchPanel({
    value,
    onChange,
    onSubmit,
    loading = false,
}: {
    value: MarketplaceSearchFilters;
    onChange: (next: MarketplaceSearchFilters) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    loading?: boolean;
}) {
    return (
        <OperatorSearchShell
            value={{
                q: value.q,
                country: value.country,
                region: value.region,
                locality: value.comuna,
                date: value.date,
            }}
            onChange={(next) => onChange({
                ...value,
                q: next.q,
                country: next.country,
                region: next.region,
                comuna: next.locality,
                date: next.date ?? '',
            })}
            onSubmit={onSubmit}
            loading={loading}
            fields={['q', 'country', 'region', 'locality', 'date']}
            copy={SERENATAS_SEARCH_COPY}
        />
    );
}
